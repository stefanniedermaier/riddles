import { describe, expect, it } from 'vitest'

import { createGeometry } from '../geometry'
import { blockedCells, countCrowns, findConflicts, isSolved, isValidSolution } from '../rules'
import { CROWN, MARK, type CellState } from '../types'

// prettier-ignore
const regions = [
  0, 0, 1, 1, 1,
  0, 0, 1, 1, 1,
  0, 0, 2, 1, 1,
  0, 3, 3, 4, 4,
  0, 3, 4, 4, 4,
]
const solution = [3, 0, 2, 4, 1]
const geo = createGeometry(5, regions)

function board(crowns: number[], marks: number[] = []): CellState[] {
  const cells = new Array<CellState>(25).fill(0)
  for (const cell of crowns) cells[cell] = CROWN
  for (const cell of marks) cells[cell] = MARK
  return cells
}

describe('rules', () => {
  it('accepts the solution', () => {
    const cells = board(solution.map((col, row) => row * 5 + col))
    expect(countCrowns(cells)).toBe(5)
    expect(isSolved(geo, cells)).toBe(true)
    expect(findConflicts(geo, cells).some(Boolean)).toBe(false)
    expect(isValidSolution(5, regions, solution)).toBe(true)
  })

  it('flags crowns in the same row, column or region', () => {
    expect(findConflicts(geo, board([0, 3]))[0]).toBe(true) // same row
    expect(findConflicts(geo, board([0, 15]))[15]).toBe(true) // same column
    expect(findConflicts(geo, board([1, 10]))[10]).toBe(true) // same region (0)
    expect(findConflicts(geo, board([0, 13])).some(Boolean)).toBe(false)
  })

  it('flags touching crowns, including diagonals', () => {
    const conflicts = findConflicts(geo, board([7, 13]))
    expect(conflicts[7]).toBe(true)
    expect(conflicts[13]).toBe(true)
  })

  it('computes cells blocked by crowns', () => {
    const blocked = blockedCells(geo, board([12]))
    // row 2, column 2, region 2 (only the crown itself) and the 8 neighbours
    expect(blocked[12]).toBe(false)
    expect(blocked[10]).toBe(true)
    expect(blocked[2]).toBe(true)
    expect(blocked[6]).toBe(true)
    expect(blocked[18]).toBe(true)
    expect(blocked[0]).toBe(false)
    expect(blocked[24]).toBe(false)
  })

  it('rejects invalid solutions', () => {
    expect(isValidSolution(5, regions, [0, 2, 4, 1, 3])).toBe(false)
    expect(isValidSolution(5, regions, [3, 0, 2])).toBe(false)
  })
})
