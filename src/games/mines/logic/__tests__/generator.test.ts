import { describe, expect, it } from 'vitest'

import { adjacentCounts, neighbourTable } from '../board'
import { GRADE_DISTANCE, generatePuzzle } from '../generator'
import { initialCells } from '../rules'
import { solveBoard } from '../solver'
import { DIFFICULTIES, REVEALED, SIZES, isMinesPuzzle } from '../types'

describe('mines generator', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`builds valid ${difficulty} boards that are solvable from the start area`, () => {
      const size = SIZES[difficulty]
      for (const seed of [1, 2, 3]) {
        const puzzle = generatePuzzle(difficulty, seed)
        expect(isMinesPuzzle(puzzle)).toBe(true)
        expect(puzzle.mines).toHaveLength(size.mines)
        expect([...puzzle.mines].sort((a, b) => a - b)).toEqual(puzzle.mines)

        // The start and its neighbours are free, so the start area has at least 9 cells.
        const table = neighbourTable(puzzle.width, puzzle.height)
        for (const cell of [puzzle.start, ...table[puzzle.start]!]) expect(puzzle.mines).not.toContain(cell)
        expect(initialCells(puzzle).filter((state) => state === REVEALED).length).toBeGreaterThanOrEqual(9)

        const isMine = new Uint8Array(puzzle.width * puzzle.height)
        for (const mine of puzzle.mines) isMine[mine] = 1
        const counts = adjacentCounts(puzzle.width, puzzle.height, puzzle.mines)
        const result = solveBoard(puzzle.width, puzzle.height, isMine, counts, puzzle.start, puzzle.mines.length)
        expect(result.solved).toBe(true)
        expect(result.grade).toEqual(puzzle.grade)
        // Easy to Hard always fit; Expert falls back to the closest board now and then.
        expect(GRADE_DISTANCE[difficulty](puzzle.grade)).toBeLessThanOrEqual(difficulty === 'expert' ? 2 : 0)
      }
    })
  }

  it('grades get harder with the difficulty', () => {
    const advanced = (difficulty: (typeof DIFFICULTIES)[number]) =>
      [1, 2, 3].map((seed) => generatePuzzle(difficulty, seed).grade.slice(1).reduce((a, b) => a + b, 0))
    expect(advanced('easy')).toEqual([0, 0, 0])
    expect(Math.min(...advanced('expert'))).toBeGreaterThan(Math.max(...advanced('medium')) - 1)
  })

  it('is deterministic per seed', () => {
    expect(generatePuzzle('medium', 42)).toEqual(generatePuzzle('medium', 42))
    expect(generatePuzzle('medium', 42)).not.toEqual(generatePuzzle('medium', 43))
  })
})
