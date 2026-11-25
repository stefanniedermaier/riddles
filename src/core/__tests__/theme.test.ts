import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { settings } from '../settings'
import { installTheme, motionEnabled, resolvedTheme } from '../theme'

function addMeta(scheme: 'light' | 'dark'): HTMLMetaElement {
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.setAttribute('media', `(prefers-color-scheme: ${scheme})`)
  document.head.append(meta)
  return meta
}

describe('theme colour', () => {
  afterEach(() => {
    settings.value.theme = 'system'
    settings.value.motion = 'system'
    document.head.innerHTML = ''
  })

  it('keeps one colour per system theme, or both in a fixed theme', async () => {
    const light = addMeta('light')
    const dark = addMeta('dark')
    installTheme()
    await nextTick()
    expect([light.content, dark.content]).toEqual(['#f6f5f2', '#15141b'])

    settings.value.theme = 'dark'
    await nextTick()
    expect([light.content, dark.content]).toEqual(['#15141b', '#15141b'])
    expect(document.documentElement.dataset.theme).toBe('dark')

    settings.value.theme = 'light'
    await nextTick()
    expect([light.content, dark.content]).toEqual(['#f6f5f2', '#f6f5f2'])
  })

  it('reflects theme and motion on <html>; "system" follows the media queries', async () => {
    installTheme()
    // jsdom matches no media query: light and full motion.
    expect(resolvedTheme.value).toBe('light')
    expect(motionEnabled.value).toBe(true)
    settings.value.theme = 'dark'
    settings.value.motion = 'reduced'
    await nextTick()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.motion).toBe('reduced')
    settings.value.motion = 'full'
    await nextTick()
    expect(document.documentElement.dataset.motion).toBe('full')
  })
})
