/**
 * Region colours (11 entries, enough for up to 11×11 grids).
 * Light theme: soft pastels. Dark theme: the same hues, deeper and muted.
 * Regions are also separated by thick borders, so colour is never the only cue.
 */
export const REGION_COLORS = {
  light: [
    '#f6b8c4', // rose
    '#a9cff5', // sky
    '#bfe3ae', // green
    '#f8d98a', // yellow
    '#d3c1f4', // lavender
    '#f7c39d', // peach
    '#a3e0d8', // teal
    '#efb5e3', // orchid
    '#d5e88f', // lime
    '#b9c3d6', // slate
    '#e6cfb0', // sand
  ],
  dark: [
    '#7a3d4b',
    '#2f557f',
    '#3e6935',
    '#76622a',
    '#55437f',
    '#7b4b2e',
    '#2a6a62',
    '#713a6a',
    '#5a6a26',
    '#454f63',
    '#6a5840',
  ],
} as const

export function regionColor(theme: 'light' | 'dark', region: number): string {
  const colors = REGION_COLORS[theme]
  return colors[region % colors.length]!
}
