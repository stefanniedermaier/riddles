/**
 * Water colours (12; light and dark variants of the same colour families), chosen to be easy
 * to tell apart. The most distinct colours come first, so smaller levels only use those.
 * Letters (setting "Show symbols") help when colours are hard to tell apart.
 */
const LIGHT = [
  '#d81b2c', // red
  '#1565d8', // blue
  '#0f9438', // green
  '#f2c200', // yellow
  '#f26b00', // orange
  '#5b1fa8', // purple
  '#00a2b8', // cyan
  '#e33aa8', // pink
  '#1c1c1c', // black
  '#6b3a1a', // brown
  '#9a9a9a', // grey
  '#7cc242', // lime
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
  '#7a7a7a', // grey
  '#b6f05a', // lime
] as const

export function waterColor(theme: 'light' | 'dark', color: number): string {
  const list = theme === 'dark' ? DARK : LIGHT
  return list[color % list.length]!
}

/** Text colour for a symbol on a layer (black or white, whichever reads better). */
export function symbolColor(theme: 'light' | 'dark', color: number): string {
  const hex = waterColor(theme, color)
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number]
  const lum = 0.2126 * r ** 2.2 + 0.7152 * g ** 2.2 + 0.0722 * b ** 2.2
  return lum > 0.25 ? '#111111' : '#ffffff'
}

export function colorLabel(color: number): string {
  return String.fromCharCode(65 + color)
}
