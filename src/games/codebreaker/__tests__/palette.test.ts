import { describe, expect, it } from 'vitest'

import { pegColor, shapeColor } from '../palette'

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number]
  return (x + 0.05) / (y + 0.05)
}

describe('palettes (WCAG)', () => {
  for (const theme of ['light', 'dark'] as const) {
    it(`shapes on pegs reach 4.5:1 (${theme})`, () => {
      for (let color = 0; color < 8; color++) {
        expect(contrast(shapeColor(theme, color), pegColor(theme, color))).toBeGreaterThanOrEqual(4.5)
      }
    })
  }
})
