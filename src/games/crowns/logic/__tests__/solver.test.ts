import { describe, expect, it } from 'vitest'

import { countSolutions, hasUniqueSolution } from '../solver'

/** Regions = rows, so only the column and touching rules constrain the crowns. */
function rowRegions(size: number): number[] {
  return Array.from({ length: size * size }, (_, cell) => Math.floor(cell / size))
}

describe('countSolutions', () => {
  it('counts non-touching permutations (OEIS A002464)', () => {
    expect(countSolutions(4, rowRegions(4), 1000).count).toBe(2)
    expect(countSolutions(5, rowRegions(5), 1000).count).toBe(14)
    expect(countSolutions(6, rowRegions(6), 1000).count).toBe(90)
  })

  it('stops at the limit and returns the solutions found', () => {
    const result = countSolutions(6, rowRegions(6), 2)
    expect(result.count).toBe(2)
    expect(result.solutions).toHaveLength(2)
    for (const solution of result.solutions) {
      expect(new Set(solution).size).toBe(6)
    }
  })

  it('detects a unique solution', () => {
    // prettier-ignore
    const regions = [
      0, 0, 1, 1, 1,
      0, 0, 1, 1, 1,
      0, 0, 2, 1, 1,
      0, 3, 3, 4, 4,
      0, 3, 4, 4, 4,
    ]
    const result = countSolutions(5, regions, 2)
    expect(result.count).toBe(1)
    expect(result.solutions[0]).toEqual([3, 0, 2, 4, 1])
    expect(hasUniqueSolution(5, regions)).toBe(true)
  })

  it('returns zero for impossible grids', () => {
    // Regions 0 and 1 both lie in the first row only – they cannot both get a crown.
    // prettier-ignore
    const regions = [
      0, 0, 1, 1,
      2, 2, 3, 3,
      2, 2, 3, 3,
      2, 2, 3, 3,
    ]
    expect(countSolutions(4, regions).count).toBe(0)
  })
})
