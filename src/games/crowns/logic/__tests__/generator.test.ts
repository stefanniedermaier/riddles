import { describe, expect, it } from 'vitest'

import { generatePuzzle, LEVEL_WINDOW } from '../generator'
import { createGeometry, neighbors4 } from '../geometry'
import { solveLogically } from '../logic'
import { isValidSolution } from '../rules'
import { countSolutions } from '../solver'
import { isCrownsPuzzle, SIZES, type Difficulty } from '../types'

function regionsAreContiguous(size: number, regions: number[]): boolean {
  for (let k = 0; k < size; k++) {
    const cells = regions.flatMap((r, cell) => (r === k ? [cell] : []))
    if (cells.length === 0) return false
    const seen = new Set([cells[0]!])
    const queue = [cells[0]!]
    while (queue.length > 0) {
      const cell = queue.pop()!
      for (const n of neighbors4(size, cell)) {
        if (regions[n] === k && !seen.has(n)) {
          seen.add(n)
          queue.push(n)
        }
      }
    }
    if (seen.size !== cells.length) return false
  }
  return true
}

const cases: [Difficulty, number[]][] = [
  ['easy', [1, 2, 3, 4]],
  ['medium', [1, 2, 3, 4]],
  ['hard', [1, 2, 3]],
  ['expert', [1, 2, 3]],
]

describe('generatePuzzle', () => {
  for (const [difficulty, seeds] of cases) {
    it(`creates valid, unique, logically solvable ${difficulty} puzzles`, () => {
      for (const seed of seeds) {
        const puzzle = generatePuzzle(difficulty, seed)
        const { size, regions, solution } = puzzle

        expect(isCrownsPuzzle(puzzle)).toBe(true)
        expect(SIZES[difficulty]).toContain(size)
        expect(new Set(regions).size).toBe(size)
        expect(regionsAreContiguous(size, regions)).toBe(true)

        // Regions are numbered in reading order.
        const firstSeen: number[] = []
        for (const r of regions) if (!firstSeen.includes(r)) firstSeen.push(r)
        expect(firstSeen).toEqual(Array.from({ length: size }, (_, i) => i))

        // Every region holds exactly one solution crown.
        const crownRegions = solution.map((col, row) => regions[row * size + col])
        expect(new Set(crownRegions).size).toBe(size)

        expect(isValidSolution(size, regions, solution)).toBe(true)
        const { count, solutions } = countSolutions(size, regions, 2)
        expect(count).toBe(1)
        expect(solutions[0]).toEqual(solution)

        const grade = solveLogically(createGeometry(size, regions))
        expect(grade.solved).toBe(true)
        expect(grade.hardestLevel).toBe(puzzle.hardestLevel)
        expect(puzzle.hardestLevel).toBeGreaterThanOrEqual(LEVEL_WINDOW[difficulty].min)
        expect(puzzle.hardestLevel).toBeLessThanOrEqual(LEVEL_WINDOW[difficulty].max)
      }
    })
  }

  it('is deterministic per seed', () => {
    expect(generatePuzzle('medium', 77)).toEqual(generatePuzzle('medium', 77))
    expect(generatePuzzle('expert', 5)).toEqual(generatePuzzle('expert', 5))
    expect(generatePuzzle('easy', 1)).not.toEqual(generatePuzzle('easy', 2))
  })

  it('supports custom sizes', () => {
    const puzzle = generatePuzzle('easy', 9, { size: 5 })
    expect(puzzle.size).toBe(5)
    expect(countSolutions(5, puzzle.regions).count).toBe(1)
  })
})
