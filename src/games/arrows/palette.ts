import type { Direction } from './logic/types'

/**
 * One colour per direction (up, right, down, left). The arrowhead shows the direction as
 * well, so the colours are a help, not the only cue.
 */
const COLORS: Record<'light' | 'dark', Record<Direction, string>> = {
  light: { 0: '#d43b55', 1: '#2f6fd0', 2: '#1f8f5f', 3: '#c27c00' },
  dark: { 0: '#ff6b81', 1: '#6aa2ff', 2: '#45c98d', 3: '#f2b544' },
}

export function arrowColor(theme: 'light' | 'dark', dir: Direction): string {
  return COLORS[theme][dir]
}
