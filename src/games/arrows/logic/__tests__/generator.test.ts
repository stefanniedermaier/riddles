import { describe, expect, it } from 'vitest'

import { dependencyDepth, solveOrder } from '../analysis'
import { generatePuzzle, PARAMS } from '../generator'
import { DIFFICULTIES, SIZES, isArrowsPuzzle } from '../types'

describe('arrows generator', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`builds valid, solvable ${difficulty} puzzles inside the difficulty window`, () => {
      const params = PARAMS[difficulty]
      for (const seed of [1, 2, 3]) {
        const puzzle = generatePuzzle(difficulty, seed)
        expect(isArrowsPuzzle(puzzle)).toBe(true) // no overlaps, connected bodies, head direction
        expect(puzzle.size).toBe(SIZES[difficulty])

        const covered = puzzle.arrows.reduce((sum, arrow) => sum + arrow.cells.length, 0)
        expect(covered / puzzle.size ** 2).toBeGreaterThanOrEqual(params.coverage)
        expect(puzzle.arrows.length).toBeGreaterThanOrEqual(params.arrows[0])
        expect(puzzle.arrows.length).toBeLessThanOrEqual(params.arrows[1])
        for (const arrow of puzzle.arrows) expect(arrow.cells.length).toBeLessThanOrEqual(params.maxLength)

        expect(solveOrder(puzzle)).toHaveLength(puzzle.arrows.length)
        expect(dependencyDepth(puzzle)).toBe(puzzle.depth)
        expect(puzzle.depth).toBeGreaterThanOrEqual(params.depth[0])
        expect(puzzle.depth).toBeLessThanOrEqual(params.depth[1])
      }
    })
  }

  it('is deterministic per seed', () => {
    expect(generatePuzzle('medium', 42)).toEqual(generatePuzzle('medium', 42))
    expect(generatePuzzle('medium', 42)).not.toEqual(generatePuzzle('medium', 43))
  })

  it('never starts with an empty move list', () => {
    for (const seed of [4, 5, 6]) {
      const puzzle = generatePuzzle('expert', seed)
      expect(solveOrder(puzzle)?.length).toBe(puzzle.arrows.length)
    }
  })
})
