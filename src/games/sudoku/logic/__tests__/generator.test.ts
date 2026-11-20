import { describe, expect, it } from 'vitest'

import { PROFILES, generatePuzzle } from '../generator'
import { gradePuzzle } from '../grader'
import { countSolutions, isSolvedGrid } from '../solver'
import { DIFFICULTIES, isSudokuPuzzle } from '../types'

const SEEDS = [1, 42, 2024, 99_991]

describe('generator', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`creates valid ${difficulty} puzzles`, () => {
      for (const seed of SEEDS) {
        const puzzle = generatePuzzle(difficulty, seed)
        expect(isSudokuPuzzle(puzzle)).toBe(true)
        expect(isSolvedGrid(puzzle.solution)).toBe(true)
        const inconsistent = puzzle.givens.filter(
          (digit, cell) => digit !== 0 && digit !== puzzle.solution[cell],
        )
        expect(inconsistent).toEqual([])
        expect(countSolutions(puzzle.givens)).toBe(1)

        const grade = gradePuzzle(puzzle.givens)
        expect(grade.solved).toBe(true)
        expect(grade.hardestLevel).toBe(PROFILES[difficulty].level)
        expect(puzzle.hardestLevel).toBe(grade.hardestLevel)
        expect(puzzle.givens.filter((d) => d !== 0).length).toBeLessThanOrEqual(
          PROFILES[difficulty].maxGivens,
        )
      }
    })
  }

  it('is deterministic per seed', () => {
    expect(generatePuzzle('hard', 123)).toEqual(generatePuzzle('hard', 123))
    expect(generatePuzzle('hard', 123).givens).not.toEqual(generatePuzzle('hard', 124).givens)
  })

  it('uses symmetric clue patterns', () => {
    const { givens } = generatePuzzle('medium', 7)
    for (let cell = 0; cell < 81; cell++) {
      expect(givens[cell] === 0).toBe(givens[80 - cell] === 0)
    }
  })

  it('falls back to the best candidate when the attempt budget is exhausted', () => {
    const puzzle = generatePuzzle('expert', 5, { maxAttempts: 1 })
    expect(countSolutions(puzzle.givens)).toBe(1)
    expect(gradePuzzle(puzzle.givens).solved).toBe(true)
  })
})
