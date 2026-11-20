import { describe, expect, it } from 'vitest'

import { createRng } from '@/core/rng'
import { solve } from '../solver'
import type { Endpoint } from '../types'
import { bruteForceCount, SMALL, validSolution } from './helpers'

describe('links solver', () => {
  it('finds the unique solution of a small puzzle', () => {
    const result = solve(SMALL.size, SMALL.endpoints)
    expect(result.count).toBe(1)
    expect(result.aborted).toBe(false)
    expect(result.solutions[0]).toEqual(SMALL.solution)
  })

  it('detects multiple solutions', () => {
    // One colour from corner to corner of a 3×3 grid: several Hamiltonian paths.
    const result = solve(3, [{ color: 0, a: 0, b: 8 }], { limit: 10 })
    expect(result.count).toBeGreaterThan(1)
    for (const solution of result.solutions) expect(validSolution(3, [{ color: 0, a: 0, b: 8 }], solution)).toBe('ok')
  })

  it('detects unsolvable puzzles', () => {
    // A must avoid B's dot in the middle of the top row; B is then walled in.
    const result = solve(3, [
      { color: 0, a: 0, b: 2 },
      { color: 1, a: 1, b: 7 },
    ])
    expect(result.count).toBe(0)
    expect(result.aborted).toBe(false)
  })

  it('agrees with an independent brute force on random small puzzles', () => {
    const rng = createRng(42)
    let checked = 0
    for (let i = 0; i < 120; i++) {
      const size = rng.range(3, 4)
      const cells = rng.shuffle(Array.from({ length: size * size }, (_, c) => c))
      const colors = rng.range(1, 3)
      const endpoints: Endpoint[] = Array.from({ length: colors }, (_, color) => ({
        color,
        a: cells[2 * color]!,
        b: cells[2 * color + 1]!,
      }))
      const expected = Math.min(bruteForceCount(size, endpoints, 50), 50)
      const result = solve(size, endpoints, { limit: 50, maxNodes: 1e7 })
      expect({ endpoints, count: result.count }).toEqual({ endpoints, count: expected })
      for (const solution of result.solutions) expect(validSolution(size, endpoints, solution)).toBe('ok')
      checked++
    }
    expect(checked).toBe(120)
  })

  it('stops at the node budget', () => {
    const result = solve(7, [{ color: 0, a: 0, b: 48 }], { limit: 1000, maxNodes: 50 })
    expect(result.aborted).toBe(true)
  })
})
