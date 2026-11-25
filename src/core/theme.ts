/**
 * Resolves the theme (light/dark) and motion preference from settings + system and
 * reflects them as `data-theme` / `data-motion` on `<html>`.
 */
import { computed, ref, watchEffect, type Ref } from 'vue'

import { settings } from './settings'

function mediaRef(query: string): Ref<boolean> {
  const state = ref(false)
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return state
  const mql = window.matchMedia(query)
  state.value = mql.matches
  mql.addEventListener('change', (event) => {
    state.value = event.matches
  })
  return state
}

const systemDark = mediaRef('(prefers-color-scheme: dark)')
const systemReducedMotion = mediaRef('(prefers-reduced-motion: reduce)')

export const resolvedTheme = computed<'light' | 'dark'>(() => {
  const theme = settings.value.theme
  if (theme === 'system') return systemDark.value ? 'dark' : 'light'
  return theme
})

/** `false` when the user (or the system) asked for reduced motion. */
export const motionEnabled = computed<boolean>(() => {
  const motion = settings.value.motion
  if (motion === 'system') return !systemReducedMotion.value
  return motion === 'full'
})

/** Background colours per theme – keep in sync with `--color-bg` in tokens.css. */
const themeColors = { light: '#f6f5f2', dark: '#15141b' } as const

/**
 * `index.html` has one `theme-color` per system theme (`media="(prefers-color-scheme: …)"`),
 * so the browser and status bars match the system before any script runs. With "System"
 * each keeps its own colour; a fixed theme from the settings gives both its colour.
 */
function syncThemeColor(): void {
  const fixed = settings.value.theme === 'system' ? null : resolvedTheme.value
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const own = meta.getAttribute('media')?.includes('dark') ? 'dark' : 'light'
    meta.setAttribute('content', themeColors[fixed ?? own])
  }
}

export function installTheme(): void {
  watchEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolvedTheme.value
    root.dataset.motion = motionEnabled.value ? 'full' : 'reduced'
    syncThemeColor()
  })
}
