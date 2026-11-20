import { describe, expect, it } from 'vitest'

import { generatePuzzle, MIN_PASSES } from '../generator'
import { cluesFor } from '../lines'
import { solveByLines } from '../solver'
import { DENSITY, DIFFICULTIES, SIZES, isNonogramPuzzle } from '../types'

describe('nonogram generator', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`${difficulty}: valid, uniquely line-solvable and deterministic`, () => {
      for (const seed of [1, 2, 3, 4, 5]) {
        const puzzle = generatePuzzle(difficulty, seed)
        expect(isNonogramPuzzle(puzzle)).toBe(true)
        expect([puzzle.width, puzzle.height]).toEqual([SIZES[difficulty].width, SIZES[difficulty].height])

        // Clues describe the solution.
        const clues = cluesFor(puzzle.solution, puzzle.width, puzzle.height)
        expect(clues.rowClues).toEqual(puzzle.rowClues)
        expect(clues.colClues).toEqual(puzzle.colClues)

        // Line logic alone determines every cell – and it is the solution (⇒ unique).
        const solved = solveByLines(puzzle)
        expect(solved.solved).toBe(true)
        expect(solved.cells).toEqual(puzzle.solution)
        expect(puzzle.passes).toBeGreaterThanOrEqual(MIN_PASSES[difficulty])

        const density = puzzle.solution.reduce<number>((sum, v) => sum + v, 0) / puzzle.solution.length
        expect(density).toBeGreaterThanOrEqual(DENSITY[difficulty][0] - 0.03)
        expect(density).toBeLessThanOrEqual(DENSITY[difficulty][1] + 0.03)

        expect(generatePuzzle(difficulty, seed)).toEqual(puzzle)
      }
    })
  }

  it('different seeds give different puzzles', () => {
    expect(generatePuzzle('medium', 1).solution).not.toEqual(generatePuzzle('medium', 2).solution)
  })
})
