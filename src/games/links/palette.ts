/**
 * Line colours of Links (13 colours; light and dark variants). Chosen for distinct hues and
 * enough contrast on the board surface; labels (A–M) help when colours are hard to tell apart.
 */
const LIGHT = [
  '#e0384f', // red
  '#2f6fdf', // blue
  '#1f9a55', // green
  '#e3a700', // yellow
  '#ef7a1c', // orange
  '#8a4fe0', // violet
  '#0fa3c4', // cyan
  '#de4bad', // pink
  '#8d5f33', // brown
  '#7fb317', // lime
  '#3a3fa6', // indigo
  '#0f8a73', // teal
  '#6b7280', // grey
] as const

const DARK = [
  '#ff6178',
  '#5d9bff',
  '#3fd07f',
  '#f7d046',
  '#ff9a45',
  '#ab8bff',
  '#4fd6f2',
  '#ff7ad2',
  '#c99a68',
  '#b8e64e',
  '#8b90ff',
  '#3fd4b6',
  '#b9bfcc',
] as const

export const PALETTE_SIZE = LIGHT.length

export function lineColor(theme: 'light' | 'dark', color: number): string {
  const list = theme === 'dark' ? DARK : LIGHT
  return list[color % list.length]!
}

export function colorLabel(color: number): string {
  return String.fromCharCode(65 + (color % 26))
}
