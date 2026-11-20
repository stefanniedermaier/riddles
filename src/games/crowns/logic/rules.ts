/** Rule checks on a player's board. */
import { createGeometry, neighbors8, type Geometry } from './geometry'
import { CROWN, type CellState } from './types'

/** `true` for every crown that breaks a rule (shares a unit with or touches another crown). */
export function findConflicts(geo: Geometry, cells: readonly CellState[]): boolean[] {
  const conflicts = cells.map(() => false)
  const crownsPerUnit = new Array<number>(geo.unitCells.length).fill(0)
  cells.forEach((state, cell) => {
    if (state === CROWN) for (const u of geo.cellUnits[cell]!) crownsPerUnit[u]! += 1
  })
  cells.forEach((state, cell) => {
    if (state !== CROWN) return
    const sharesUnit = geo.cellUnits[cell]!.some((u) => crownsPerUnit[u]! > 1)
    const touches = neighbors8(geo.size, cell).some((n) => cells[n] === CROWN)
    if (sharesUnit || touches) conflicts[cell] = true
  })
  return conflicts
}

/** Cells (without a crown) that cannot hold a crown because of the crowns already placed. */
export function blockedCells(geo: Geometry, cells: readonly CellState[]): boolean[] {
  const blocked = cells.map(() => false)
  cells.forEach((state, cell) => {
    if (state !== CROWN) return
    for (const peer of geo.peers[cell]!) if (cells[peer] !== CROWN) blocked[peer] = true
  })
  return blocked
}

export function countCrowns(cells: readonly CellState[]): number {
  return cells.reduce<number>((sum, state) => sum + (state === CROWN ? 1 : 0), 0)
}

/** Solved = one crown per row/column/region and no touching crowns. */
export function isSolved(geo: Geometry, cells: readonly CellState[]): boolean {
  return countCrowns(cells) === geo.size && !findConflicts(geo, cells).some(Boolean)
}

/** Checks a solution (column per row) against all rules. */
export function isValidSolution(
  size: number,
  regions: readonly number[],
  solution: readonly number[],
): boolean {
  if (solution.length !== size) return false
  const cells = new Array<CellState>(size * size).fill(0)
  solution.forEach((col, row) => {
    cells[row * size + col] = CROWN
  })
  return isSolved(createGeometry(size, regions), cells)
}
