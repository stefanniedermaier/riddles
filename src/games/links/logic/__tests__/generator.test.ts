import { describe, expect, it } from 'vitest'

import { generatePuzzle } from '../generator'
import { solve } from '../solver'
import { COLOR_RANGE, DIFFICULTIES, SIZES, isLinksPuzzle } from '../types'
import { validSolution } from './helpers'

const SEEDS = { easy: [1, 2, 3, 4], medium: [1, 2, 3], hard: [1, 2], expert: [7] } as const

describe('links generator', () => {
  for (const difficulty of DIFFICULTIES) {
    for (const seed of SEEDS[difficulty]) {
      it(`${difficulty} #${seed}: valid, covering, unique`, () => {
        const puzzle = generatePuzzle(difficulty, seed)
        expect(isLinksPuzzle(puzzle)).toBe(true)
        expect(puzzle.size).toBe(SIZES[difficulty])
        const [min, max] = COLOR_RANGE[difficulty]
        expect(puzzle.endpoints.length).toBeGreaterThanOrEqual(min)
        expect(puzzle.endpoints.length).toBeLessThanOrEqual(max)
        expect(validSolution(puzzle.size, puzzle.endpoints, puzzle.solution)).toBe('ok')
        for (const path of puzzle.solution) expect(path.length).toBeGreaterThanOrEqual(3)

        const check = solve(puzzle.size, puzzle.endpoints, { limit: 2, maxNodes: 2_000_000 })
        expect(check.aborted).toBe(false)
        expect(check.count).toBe(1)
        expect(check.solutions[0]).toEqual(puzzle.solution)
      })
    }
  }

  it('is deterministic per seed', () => {
    expect(generatePuzzle('medium', 11)).toEqual(generatePuzzle('medium', 11))
    expect(generatePuzzle('medium', 11)).not.toEqual(generatePuzzle('medium', 12))
  })
})
