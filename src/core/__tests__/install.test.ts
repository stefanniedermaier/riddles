import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  installInstallPrompt,
  installMode,
  isIosDevice,
  isRunningStandalone,
  promptInstall,
  resetInstallState,
  type BeforeInstallPromptEvent,
} from '../install'

function fakeWindow(options: { standalone?: boolean; userAgent?: string; platform?: string; touch?: number }) {
  const target = new EventTarget()
  const media = (query: string) => ({
    matches: query === '(display-mode: standalone)' && !!options.standalone,
    addEventListener: () => {},
  })
  return Object.assign(target, {
    matchMedia: media,
    navigator: {
      userAgent: options.userAgent ?? 'Mozilla/5.0 (Linux; Android 15) Chrome/140',
      platform: options.platform ?? 'Linux armv8l',
      maxTouchPoints: options.touch ?? 5,
    },
  }) as unknown as Window
}

function promptEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent
  Object.assign(event, {
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  })
  return event
}

describe('install', () => {
  beforeEach(() => resetInstallState())

  it('detects iPhone, iPad (desktop UA) and not Android', () => {
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 20_0)', platform: 'iPhone', maxTouchPoints: 5 })).toBe(true)
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true)
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false)
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 15)', platform: 'Linux', maxTouchPoints: 5 })).toBe(false)
  })

  it('detects standalone mode', () => {
    expect(isRunningStandalone(fakeWindow({ standalone: true }))).toBe(true)
    expect(isRunningStandalone(fakeWindow({}))).toBe(false)
  })

  it('offers the native prompt after beforeinstallprompt and hides after install', async () => {
    const win = fakeWindow({})
    installInstallPrompt(win)
    expect(installMode.value).toBeNull()

    const event = promptEvent('accepted')
    win.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(installMode.value).toBe('native')

    await expect(promptInstall()).resolves.toBe(true)
    expect(event.prompt).toHaveBeenCalledOnce()
    expect(installMode.value).toBeNull()
  })

  it('a dismissed prompt cannot be reused', async () => {
    const win = fakeWindow({})
    installInstallPrompt(win)
    win.dispatchEvent(promptEvent('dismissed'))
    await expect(promptInstall()).resolves.toBe(false)
    expect(installMode.value).toBeNull()
  })

  it('shows instructions on iOS and nothing when already installed', () => {
    installInstallPrompt(fakeWindow({ userAgent: 'Mozilla/5.0 (iPhone)', platform: 'iPhone' }))
    expect(installMode.value).toBe('ios')

    resetInstallState()
    installInstallPrompt(fakeWindow({ standalone: true, userAgent: 'Mozilla/5.0 (iPhone)', platform: 'iPhone' }))
    expect(installMode.value).toBeNull()
  })

  it('hides after the appinstalled event', () => {
    const win = fakeWindow({})
    installInstallPrompt(win)
    win.dispatchEvent(promptEvent('dismissed'))
    win.dispatchEvent(new Event('appinstalled'))
    expect(installMode.value).toBeNull()
  })
})
