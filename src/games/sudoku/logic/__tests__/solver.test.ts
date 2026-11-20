import { describe, expect, it } from 'vitest'

import { createRng } from '@/core/rng'
import { countSolutions, generateSolvedGrid, isSolvedGrid, solveGrid } from '../solver'
import { EASY_PUZZLE, EASY_SOLUTION } from './helpers'

describe('exact solver', () => {
  it('solves a known puzzle', () => {
    expect(solveGrid(EASY_PUZZLE)).toEqual(EASY_SOLUTION)
    expect(countSolutions(EASY_PUZZLE)).toBe(1)
  })

  it('detects multiple and zero solutions', () => {
    expect(countSolutions(new Array<number>(81).fill(0))).toBe(2)
    const broken = EASY_PUZZLE.slice()
    broken[2] = 5 // second 5 in row 0
    expect(countSolutions(broken)).toBe(0)
    expect(solveGrid(broken)).toBeNull()
  })

  it('fills random valid grids deterministically', () => {
    const a = generateSolvedGrid(createRng(1))
    const b = generateSolvedGrid(createRng(1))
    const c = generateSolvedGrid(createRng(2))
    expect(isSolvedGrid(a)).toBe(true)
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })

  it('validates solved grids', () => {
    expect(isSolvedGrid(EASY_SOLUTION)).toBe(true)
    const wrong = EASY_SOLUTION.slice()
    ;[wrong[0], wrong[1]] = [wrong[1]!, wrong[0]!]
    expect(isSolvedGrid(wrong)).toBe(false)
    expect(isSolvedGrid(EASY_PUZZLE)).toBe(false)
  })
})
