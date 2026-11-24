import { describe, expect, it } from 'vitest'

import { generatePuzzle } from '../generator'
import { isComplete, isSolved, pour, pourAmount, topRun, unpour } from '../rules'
import { solve } from '../solver'
import { COLORS, DIFFICULTIES, EMPTY_TUBES, isWaterSortPuzzle, type Tubes } from '../types'

describe('water sort rules', () => {
  it('pours the top run onto the same colour or into an empty tube, as much as fits', () => {
    const tubes: Tubes = [[0, 1, 1], [2, 2, 1], [], [0, 0, 2, 0]]
    expect(topRun(tubes[0]!)).toEqual({ color: 1, count: 2 })
    expect(pourAmount(tubes, { from: 0, to: 1 })).toBe(1) // only one place left
    expect(pourAmount(tubes, { from: 0, to: 2 })).toBe(2)
    expect(pourAmount(tubes, { from: 0, to: 3 })).toBe(0) // full
    expect(pourAmount(tubes, { from: 1, to: 3 })).toBe(0)
    expect(pourAmount(tubes, { from: 2, to: 0 })).toBe(0) // empty source
    const result = pour(tubes, { from: 0, to: 2 })!
    expect(result.tubes).toEqual([[0], [2, 2, 1], [1, 1], [0, 0, 2, 0]])
    expect(result.move).toEqual({ from: 0, to: 2, amount: 2 })
    expect(unpour(result.tubes, result.move)).toEqual(tubes)
    expect(pour(tubes, { from: 1, to: 3 })).toBeNull()
  })

  it('is solved when every tube is empty or full with one colour', () => {
    expect(isComplete([3, 3, 3, 3])).toBe(true)
    expect(isComplete([3, 3, 3])).toBe(false)
    expect(isSolved([[1, 1, 1, 1], [], [0, 0, 0, 0]])).toBe(true)
    expect(isSolved([[1, 1, 1], [1], [0, 0, 0, 0]])).toBe(false)
  })
})

describe('water sort generator and solver', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`builds scrambled, solvable ${difficulty} levels`, () => {
      for (const seed of [1, 2, 3]) {
        const puzzle = generatePuzzle(difficulty, seed)
        expect(isWaterSortPuzzle(puzzle)).toBe(true) // 4 layers of every colour
        expect(puzzle.colors).toBe(COLORS[difficulty])
        expect(puzzle.tubes.filter((tube) => tube.length === 0)).toHaveLength(EMPTY_TUBES)
        expect(puzzle.tubes.some(isComplete)).toBe(false)

        const moves = solve(puzzle.tubes)!
        let tubes = puzzle.tubes
        for (const move of moves) tubes = pour(tubes, move)!.tubes // every move is legal
        expect(isSolved(tubes)).toBe(true)
      }
    })
  }

  it('is deterministic per seed', () => {
    expect(generatePuzzle('hard', 5)).toEqual(generatePuzzle('hard', 5))
    expect(generatePuzzle('hard', 5)).not.toEqual(generatePuzzle('hard', 6))
  })

  it('reports a dead end', () => {
    // Both tubes full and different on top: nothing can move.
    expect(solve([[0, 1, 0, 1], [1, 0, 1, 0]])).toBeNull()
    expect(solve([[0, 0, 0, 0], []])).toEqual([])
  })
})
