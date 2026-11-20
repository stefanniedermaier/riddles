import { describe, expect, it } from 'vitest'

import {
  blockerOf,
  dependencies,
  dependencyDepth,
  freeArrows,
  occupancy,
  rayCells,
  solveOrder,
} from '../analysis'
import type { ArrowsPuzzle } from '../types'
import { chainPuzzle } from './helpers'

describe('arrows analysis', () => {
  it('computes rays to the edge in every direction', () => {
    // 4×4, cell 5 = row 1, col 1
    expect(rayCells(4, 5, 0)).toEqual([1])
    expect(rayCells(4, 5, 1)).toEqual([6, 7])
    expect(rayCells(4, 5, 2)).toEqual([9, 13])
    expect(rayCells(4, 5, 3)).toEqual([4])
    expect(rayCells(4, 3, 1)).toEqual([])
  })

  it('finds the first arrow in the way, also when the ray crosses a bent body', () => {
    // 4×4: bent arrow X occupies 4,8,9 (pointing right at 9 → 10, 11), arrow Y at 1 points down
    // through 5, 9 (X's body), 13.
    const puzzle: ArrowsPuzzle = {
      seed: 0,
      difficulty: 'easy',
      size: 4,
      depth: 0,
      arrows: [
        { id: 0, cells: [4, 8, 9], dir: 1 },
        { id: 1, cells: [1], dir: 2 },
      ],
    }
    const occ = occupancy(puzzle)
    expect(blockerOf(puzzle, occ, puzzle.arrows[1]!)).toBe(0)
    expect(blockerOf(puzzle, occ, puzzle.arrows[0]!)).toBeNull()
    expect(freeArrows(puzzle)).toEqual([0])
    expect(freeArrows(puzzle, [0])).toEqual([1])
  })

  it('computes dependencies, depth and a solving order', () => {
    const puzzle = chainPuzzle()
    expect(dependencies(puzzle)).toEqual([[1], [2], []])
    expect(dependencyDepth(puzzle)).toBe(3)
    expect(solveOrder(puzzle)).toEqual([2, 1, 0])
    expect(solveOrder(puzzle, [2])).toEqual([1, 0])
  })

  it('detects deadlocks (arrows pointing at each other)', () => {
    const puzzle: ArrowsPuzzle = {
      seed: 0,
      difficulty: 'easy',
      size: 3,
      depth: 0,
      arrows: [
        { id: 0, cells: [3], dir: 1 },
        { id: 1, cells: [5], dir: 3 },
      ],
    }
    expect(dependencyDepth(puzzle)).toBe(Infinity)
    expect(solveOrder(puzzle)).toBeNull()
  })
})
