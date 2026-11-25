/**
 * Region colours (11 entries, enough for up to 11×11 grids): vivid, clearly distinguishable
 * hues (minimum pairwise CIEDE2000 distance 17.5 light / 14.3 dark, previously 8.8 / 8.5) with
 * at least 4.5:1 contrast to the star and mark symbols drawn on top (`--color-text`). The most
 * distinct colours come first, so small grids only use those. Regions are also separated by
 * thick borders, so colour is never the only cue.
 */
const REGION_COLORS = {
  light: [
    '#eb4773', // red
    '#47c2eb', // blue
    '#47eb5d', // green
    '#f0b642', // yellow
    '#9f64f7', // violet
    '#fa7238', // orange
    '#5cd6b1', // teal
    '#de97ed', // orchid
    '#d5e79d', // lime
    '#8a96a8', // slate
    '#caa491', // sand
  ],
  dark: [
    '#6e0c26',
    '#0c566e',
    '#0e7c2b',
    '#714f09',
    '#2c1268',
    '#862b03',
    '#18624c',
    '#7b198f',
    '#516218',
    '#343b46',
    '#533628',
  ],
} as const

export function regionColor(theme: 'light' | 'dark', region: number): string {
  const colors = REGION_COLORS[theme]
  return colors[region % colors.length]!
}
