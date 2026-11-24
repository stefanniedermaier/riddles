/**
 * Colours of the numbers 1–8. The digits are the main signal; the colours only help to read
 * the board faster. Every colour keeps at least 4.5:1 contrast on the revealed cell colour.
 */
const NUMBER_COLORS: Record<'light' | 'dark', readonly string[]> = {
  light: ['#1d5fc9', '#17773a', '#c0262f', '#3b2a9e', '#8a3b12', '#0b6a6e', '#1d1b26', '#5c5a66'],
  dark: ['#80b2ff', '#5fd68a', '#ff7f88', '#b8acff', '#f0a36b', '#5fd4d8', '#ecebf2', '#b3b0c2'],
}

export function numberColor(theme: 'light' | 'dark', number: number): string {
  return NUMBER_COLORS[theme][number - 1] ?? NUMBER_COLORS[theme][6]!
}
