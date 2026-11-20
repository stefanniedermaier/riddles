/**
 * Original colour scale of the Merge tiles: a cool hue walk (teal → blue → violet → rose →
 * amber → green …) that gets more saturated with every doubling. Text colour is chosen by
 * contrast. Values ≥ 8192 share a distinct "high" style.
 */
export interface TileColors {
  background: string
  color: string
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0), f(8), f(4)]
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

const DARK_TEXT = '#0b1220'
const LIGHT_TEXT = '#ffffff'

function readableText(rgb: [number, number, number]): string {
  const l = luminance(rgb)
  const contrastWithWhite = 1.05 / (l + 0.05)
  const contrastWithDark = (l + 0.05) / (luminance([11 / 255, 18 / 255, 32 / 255]) + 0.05)
  return contrastWithWhite >= contrastWithDark ? LIGHT_TEXT : DARK_TEXT
}

export function tileColors(value: number, theme: 'light' | 'dark'): TileColors {
  const exponent = Math.max(1, Math.round(Math.log2(value)))
  if (exponent >= 13) {
    return theme === 'light'
      ? { background: '#1e1b4b', color: '#ffffff' }
      : { background: '#e0e7ff', color: '#1e1b4b' }
  }
  const hue = (190 + (exponent - 1) * 31) % 360
  const step = Math.min(exponent - 1, 5) / 5 // 0 … 1 over the first six values
  const saturation = 0.55 + 0.3 * step
  const lightness = theme === 'light' ? 0.86 - 0.36 * step : 0.3 + 0.18 * step
  const rgb = hslToRgb(hue, saturation, lightness)
  return {
    background: `hsl(${hue} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%)`,
    color: readableText(rgb),
  }
}
