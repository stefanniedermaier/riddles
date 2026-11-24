import type { Difficulty, MinesPuzzle } from '../types'

/**
 * A small hand-made board for rule tests (any size; difficulty only labels it).
 * `rows` uses `*` for mines, `S` for the start cell and `.` for safe cells.
 */
export function boardFrom(rows: string[], difficulty: Difficulty = 'easy'): MinesPuzzle {
  const height = rows.length
  const width = rows[0]!.length
  const mines: number[] = []
  let start = 0
  rows.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === '*') mines.push(r * width + c)
      if (ch === 'S') start = r * width + c
    }),
  )
  return { seed: 0, difficulty, width, height, mines, start, grade: [0, 0, 0, 0] }
}

