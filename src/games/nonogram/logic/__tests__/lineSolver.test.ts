import { describe, expect, it } from 'vitest'

import { createRng } from '@/core/rng'
import { runsOf, sameClue } from '../lines'
import { solveLine, type Known } from '../lineSolver'

/** Independent reference: enumerate all 2^n lines. */
function bruteForce(cells: readonly Known[], clue: readonly number[]): Known[] | null {
  const n = cells.length
  let canFill = 0
  let canEmpty = 0
  let any = false
  for (let mask = 0; mask < 1 << n; mask++) {
    const values = Array.from({ length: n }, (_, i) => (mask >> i) & 1)
    if (values.some((v, i) => cells[i] !== -1 && cells[i] !== v)) continue
    if (!sameClue(runsOf(values), clue)) continue
    any = true
    for (let i = 0; i < n; i++) {
      if (values[i]) canFill |= 1 << i
      else canEmpty |= 1 << i
    }
  }
  if (!any) return null
  return Array.from({ length: n }, (_, i) => {
    const f = (canFill >> i) & 1
    const e = (canEmpty >> i) & 1
    return (f && e ? -1 : f ? 1 : 0) as Known
  })
}

describe('line solver', () => {
  it('finds the classic overlap', () => {
    expect(solveLine(new Array<Known>(10).fill(-1), [8])).toEqual([-1, -1, 1, 1, 1, 1, 1, 1, -1, -1])
    expect(solveLine(new Array<Known>(5).fill(-1), [])).toEqual([0, 0, 0, 0, 0])
    expect(solveLine(new Array<Known>(5).fill(-1), [2, 2])).toEqual([1, 1, 0, 1, 1])
    expect(solveLine(new Array<Known>(6).fill(-1), [2, 2])).toEqual([-1, 1, -1, -1, 1, -1])
  })

  it('detects contradictions', () => {
    expect(solveLine([1, 1, 1, -1, -1], [2])).toBeNull()
    expect(solveLine([0, 0, -1, 0, 0], [2])).toBeNull()
  })

  it('matches brute force on random short lines', () => {
    const rng = createRng(2024)
    for (let round = 0; round < 1500; round++) {
      const n = rng.range(1, 10)
      // Clue of a random solution, then reveal some cells (sometimes wrong ones).
      const solution = Array.from({ length: n }, () => (rng.chance(0.5) ? 1 : 0))
      const clue = runsOf(solution)
      const cells = solution.map((v) =>
        rng.chance(0.3) ? ((rng.chance(0.1) ? 1 - v : v) as Known) : (-1 as Known),
      )
      expect(solveLine(cells, clue), `${JSON.stringify(cells)} ${clue}`).toEqual(bruteForce(cells, clue))
    }
  })
})
