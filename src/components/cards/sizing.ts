import type { PileView } from './types'

/** Card height relative to its width. */
export const CARD_RATIO = 1.4
const MIN_WIDTH = 20
const MAX_WIDTH = 110
/** Room kept below a fanned column, in card heights (about six face-up cards). */
const FAN_RESERVE = 1.6

export const gapFor = (columns: number): number => (columns >= 10 ? 3 : 5)

/**
 * Card width for a table of `columns` card widths on an area of `width` × `height` pixels:
 * as wide as the columns allow, but small enough that every pile (and some room for a fanned
 * column) fits the height. A height of 0 (not measured) only applies the width.
 */
export function cardWidth(piles: readonly PileView[], columns: number, width: number, height: number): number {
  const gap = gapFor(columns)
  let best = (width - gap * (columns - 1)) / columns
  if (height > 0) {
    for (const pile of piles) {
      const rows = pile.y + 1 + (pile.fan === 'down' ? FAN_RESERVE : 0)
      best = Math.min(best, (height - pile.y * gap * 2 - 4) / rows / CARD_RATIO)
    }
  }
  return Math.max(MIN_WIDTH, Math.min(best, MAX_WIDTH))
}
