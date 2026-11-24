/**
 * Peg colours (8) with one shape each, so no colour has to be told apart by hue alone.
 * Light and dark variants of the same colour families.
 */
const LIGHT = ['#d81b2c', '#1565d8', '#0f9438', '#f2c200', '#f26b00', '#5b1fa8', '#00a2b8', '#e33aa8'] as const
const DARK = ['#ff3b4f', '#3b9cff', '#2fd35f', '#ffe23a', '#ff9530', '#9d5cff', '#43e3f0', '#ff9ad8'] as const

/** Shapes drawn on the pegs (24×24 view box, centred). */
export const SHAPES = [
  'M12 6a6 6 0 1 1 0 12a6 6 0 1 1 0-12z', // circle
  'M7 7h10v10H7z', // square
  'M12 5.5l7 12.5H5z', // triangle
  'M12 5l7 7-7 7-7-7z', // diamond
  'M12 4.8l2.1 4.5 4.9.5-3.7 3.3 1.1 4.9L12 15.5 7.6 18l1.1-4.9L5 9.8l4.9-.5z', // star
  'M10 5h4v5h5v4h-5v5h-4v-5H5v-4h5z', // plus
  'M12 5.5l6 3.5v6l-6 3.5-6-3.5V9z', // hexagon
  'M12 18.5S5.5 14.5 5.5 9.8C5.5 7.6 7.2 6 9.2 6c1.3 0 2.3.7 2.8 1.6C12.5 6.7 13.5 6 14.8 6c2 0 3.7 1.6 3.7 3.8 0 4.7-6.5 8.7-6.5 8.7z', // heart
] as const

export function pegColor(theme: 'light' | 'dark', color: number): string {
  return (theme === 'dark' ? DARK : LIGHT)[color % LIGHT.length]!
}

/** Relative luminance (WCAG) of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Black or white, whichever contrasts more (always ≥ 4.5:1). */
function bestOn(hex: string): string {
  const l = luminance(hex)
  return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? '#000000' : '#ffffff'
}

/** Colour of the shape on a peg. */
export function shapeColor(theme: 'light' | 'dark', color: number): string {
  return bestOn(pegColor(theme, color))
}
