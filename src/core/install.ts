/**
 * "Install app" support.
 *
 * - Chromium browsers (Android, desktop) fire `beforeinstallprompt`; we keep the event and
 *   show the native install dialog when the user taps our button.
 * - iOS/iPadOS has no install API: we show instructions for "Add to Home Screen".
 * - When the app already runs installed (standalone display mode) nothing is shown.
 *
 * `installInstallPrompt()` must run early (in main.ts) because the browser fires
 * `beforeinstallprompt` shortly after page load, before the home view is mounted.
 */
import { computed, ref, shallowRef } from 'vue'

/** Chromium's (non-standard) install prompt event. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface PlatformInfo {
  userAgent: string
  platform: string
  maxTouchPoints: number
}

/** iPhone, iPod and iPad (iPadOS reports itself as "MacIntel" with touch support). */
export function isIosDevice(info: PlatformInfo): boolean {
  return (
    /iphone|ipad|ipod/i.test(info.userAgent) ||
    (info.platform === 'MacIntel' && info.maxTouchPoints > 1)
  )
}

/** Whether the app currently runs as an installed app (home screen / app window). */
export function isRunningStandalone(win: Window = window): boolean {
  const media = (query: string) =>
    typeof win.matchMedia === 'function' && win.matchMedia(query).matches
  return (
    media('(display-mode: standalone)') ||
    media('(display-mode: fullscreen)') ||
    media('(display-mode: minimal-ui)') ||
    (win.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

const deferredPrompt = shallowRef<BeforeInstallPromptEvent | null>(null)
const standalone = ref(false)
const installedNow = ref(false)
const ios = ref(false)

/** `native`: our button opens the browser's install dialog; `ios`: show instructions. */
export const installMode = computed<'native' | 'ios' | null>(() => {
  if (standalone.value || installedNow.value) return null
  if (deferredPrompt.value) return 'native'
  if (ios.value) return 'ios'
  return null
})

export function installInstallPrompt(win: Window = window): void {
  standalone.value = isRunningStandalone(win)
  ios.value = isIosDevice(win.navigator)

  win.addEventListener('beforeinstallprompt', (event) => {
    // Suppress the browser's own mini-infobar; we offer our own button instead.
    event.preventDefault()
    deferredPrompt.value = event as BeforeInstallPromptEvent
  })
  win.addEventListener('appinstalled', () => {
    installedNow.value = true
    deferredPrompt.value = null
  })
  if (typeof win.matchMedia === 'function') {
    win.matchMedia('(display-mode: standalone)').addEventListener('change', (event) => {
      standalone.value = event.matches
    })
  }
}

/** Opens the native install dialog. Resolves to `true` if the user installed the app. */
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt.value
  if (!event) return false
  // A prompt event can only be used once.
  deferredPrompt.value = null
  await event.prompt()
  const { outcome } = await event.userChoice
  if (outcome === 'accepted') installedNow.value = true
  return outcome === 'accepted'
}

/** Test helper: reset the module state. */
export function resetInstallState(): void {
  deferredPrompt.value = null
  standalone.value = false
  installedNow.value = false
  ios.value = false
}
