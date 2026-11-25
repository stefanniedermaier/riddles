import { colOf, neighbors8, rowOf } from '@/core/grid'

/**
 * Precomputed geometry of a Crowns grid: units (rows, columns, regions) and, for every
 * cell, the "peers" that a crown on that cell rules out.
 */

type UnitKind = 'row' | 'col' | 'region'

export interface Unit {
  kind: UnitKind
  index: number
}

export interface Geometry {
  size: number
  regions: readonly number[]
  /** Cells per unit; unit ids: rows 0…n-1, columns n…2n-1, regions 2n…3n-1. */
  unitCells: number[][]
  /** The three unit ids (row, column, region) of every cell. */
  cellUnits: [number, number, number][]
  /** Cells excluded by a crown on the cell: same row, column, region or touching. */
  peers: number[][]
}

export function unitId(size: number, unit: Unit): number {
  const offset = unit.kind === 'row' ? 0 : unit.kind === 'col' ? size : 2 * size
  return offset + unit.index
}

export function unitFromId(size: number, id: number): Unit {
  if (id < size) return { kind: 'row', index: id }
  if (id < 2 * size) return { kind: 'col', index: id - size }
  return { kind: 'region', index: id - 2 * size }
}

export function createGeometry(size: number, regions: readonly number[]): Geometry {
  const unitCells: number[][] = Array.from({ length: 3 * size }, () => [])
  const cellUnits: [number, number, number][] = []
  for (let cell = 0; cell < size * size; cell++) {
    const units: [number, number, number] = [
      rowOf(size, cell),
      size + colOf(size, cell),
      2 * size + (regions[cell] as number),
    ]
    cellUnits.push(units)
    for (const u of units) unitCells[u]!.push(cell)
  }

  const peers: number[][] = []
  for (let cell = 0; cell < size * size; cell++) {
    const set = new Set<number>()
    for (const u of cellUnits[cell]!) for (const other of unitCells[u]!) set.add(other)
    for (const n of neighbors8(size, cell)) set.add(n)
    set.delete(cell)
    peers.push([...set].sort((a, b) => a - b))
  }

  return { size, regions, unitCells, cellUnits, peers }
}
