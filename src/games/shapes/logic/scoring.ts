/** Points for a cell cleared by a special effect (not part of a match). */
export const CELL_SCORE = 10

/** Bonus for creating a special piece. */
export const SPECIAL_BONUS = 50

/** Points for a match group of the given number of cells (before the cascade multiplier). */
export function groupScore(size: number): number {
  if (size <= 3) return 30
  if (size === 4) return 60
  return 100 + (size - 5) * 20
}
