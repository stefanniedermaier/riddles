/** Message key part per bubble colour (index = colour). */
export const COLOR_KEYS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'] as const

/**
 * The neon palette of the energy orbs: main, light (core, glyph) and deep (edge) per colour.
 * The field is a dark holo panel in both themes, so one palette fits light and dark.
 */
export const ORB_COLORS: readonly { main: string; light: string; deep: string }[] = [
  { main: '#ff3d63', light: '#ffc2cf', deep: '#7a0026' },
  { main: '#ff9124', light: '#ffdcb0', deep: '#803300' },
  { main: '#ffdd33', light: '#fff7c2', deep: '#7d6200' },
  { main: '#2ff09c', light: '#c4ffe4', deep: '#006b45' },
  { main: '#38a6ff', light: '#c9e8ff', deep: '#003c88' },
  { main: '#b45cff', light: '#ead1ff', deep: '#460a85' },
]
