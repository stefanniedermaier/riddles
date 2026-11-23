/**
 * Line colours of Links (12 colours; light and dark variants of the same colour families).
 * Optimised for telling them apart: minimum pairwise CIEDE2000 distance 22.8 (light) and
 * 20.7 (dark), at least 3:1 contrast to the board in both themes. The most distinct colours
 * come first, so smaller puzzles only use those. Labels (A–L) help when colours are hard to
 * tell apart.
 */
const LIGHT = [
  '#d81b2c', // red
  '#1565d8', // blue
  '#0f9438', // green
  '#a08000', // ochre
  '#f26b00', // orange
  '#5b1fa8', // purple
  '#00a2b8', // cyan
  '#e33aa8', // pink
  '#1c1c1c', // black
  '#6b3a1a', // brown
  '#7f7f7f', // grey
  '#0d5c63', // teal
] as const

const DARK = [
  '#ff3b4f', // red
  '#3b9cff', // blue
  '#2fd35f', // green
  '#ffe23a', // yellow
  '#ff9530', // orange
  '#9d5cff', // purple
  '#43e3f0', // cyan
  '#ff9ad8', // pink
  '#f4f4f4', // white
  '#a0703f', // brown
  '#9a9a9a', // grey
  '#2a9d8f', // teal
] as const

export const PALETTE_SIZE = LIGHT.length

export function lineColor(theme: 'light' | 'dark', color: number): string {
  const list = theme === 'dark' ? DARK : LIGHT
  return list[color % list.length]!
}

export function colorLabel(color: number): string {
  return String.fromCharCode(65 + (color % 26))
}
