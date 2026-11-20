import type { ArrowsPuzzle } from '../types'

/**
 * 3×3 board:   A A B      A (id 0) points right, blocked by B
 *              . . B?     B (id 1) points down, blocked by C
 *              . . C      C (id 2) points left and can leave right away
 * Order: C, B, A.
 */
export function chainPuzzle(): ArrowsPuzzle {
  return {
    seed: 1,
    difficulty: 'easy',
    size: 3,
    depth: 3,
    arrows: [
      { id: 0, cells: [0, 1], dir: 1 },
      { id: 1, cells: [2], dir: 2 },
      { id: 2, cells: [8], dir: 3 },
    ],
  }
}
