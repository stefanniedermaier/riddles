import type { Direction } from './logic/types'

/**
 * Optional colours per direction (up, right, down, left). Off by default: with one colour
 * per direction the order would be far too easy to read off the board.
 */
const DIRECTION_COLORS: Record<'light' | 'dark', Record<Direction, string>> = {
  light: { 0: '#d43b55', 1: '#2f6fd0', 2: '#1f8f5f', 3: '#c27c00' },
  dark: { 0: '#ff6b81', 1: '#6aa2ff', 2: '#45c98d', 3: '#f2b544' },
}

/** The single arrow colour used by default. */
const SINGLE_COLOR: Record<'light' | 'dark', string> = {
  light: '#2f3a52',
  dark: '#dbe2f0',
}

export function arrowColor(theme: 'light' | 'dark', dir: Direction, byDirection = false): string {
  return byDirection ? DIRECTION_COLORS[theme][dir] : SINGLE_COLOR[theme]
}
