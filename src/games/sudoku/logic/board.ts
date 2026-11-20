/**
 * Grid geometry helpers and bitmask utilities.
 *
 * Two grid sizes are supported:
 * - classic 9×9 with 3×3 boxes (digits 1–9),
 * - mini 6×6 with boxes of 2 rows × 3 columns (digits 1–6).
 *
 * The size is always derived from the number of cells (81 or 36), so grids, puzzles and saves
 * need no extra size field. The module-level constants (`ROWS`, `PEERS`, …) describe the
 * classic grid; size-aware code uses `geometry(size)` / `geometryOfCells(length)`.
 */
import type { Unit } from './types'

export type GridSize = 9 | 6

export interface Geometry {
  size: GridSize
  /** Rows / columns of one box. */
  boxRows: number
  boxCols: number
  cellCount: number
  /** Index lookups per cell. */
  rowOf: readonly number[]
  colOf: readonly number[]
  boxOf: readonly number[]
  rows: readonly (readonly number[])[]
  cols: readonly (readonly number[])[]
  boxes: readonly (readonly number[])[]
  /** Units in the order humans usually scan them: boxes, rows, columns. */
  allUnits: readonly Unit[]
  /** Peers (same row, column or box) of every cell. */
  peers: readonly (readonly number[])[]
  /** `isPeer[a][b]` – fast peer test. */
  isPeer: readonly Uint8Array[]
  /** Bits 1..size set. */
  allDigits: number
  /** [1, …, size] */
  digits: readonly number[]
}

function buildGeometry(size: GridSize): Geometry {
  const boxRows = size === 9 ? 3 : 2
  const boxCols = 3
  const boxesPerBand = size / boxCols
  const range = Array.from({ length: size }, (_, i) => i)
  const cellCount = size * size

  const rowOf = Array.from({ length: cellCount }, (_, cell) => Math.floor(cell / size))
  const colOf = Array.from({ length: cellCount }, (_, cell) => cell % size)
  const boxOf = rowOf.map(
    (row, cell) => Math.floor(row / boxRows) * boxesPerBand + Math.floor(colOf[cell]! / boxCols),
  )

  const rows = range.map((r) => range.map((c) => r * size + c))
  const cols = range.map((c) => range.map((r) => r * size + c))
  const boxes = range.map((b) =>
    range.map((i) => {
      const row = Math.floor(b / boxesPerBand) * boxRows + Math.floor(i / boxCols)
      const col = (b % boxesPerBand) * boxCols + (i % boxCols)
      return row * size + col
    }),
  )

  const allUnits: Unit[] = [
    ...range.map((index) => ({ kind: 'box' as const, index })),
    ...range.map((index) => ({ kind: 'row' as const, index })),
    ...range.map((index) => ({ kind: 'col' as const, index })),
  ]

  const peers = Array.from({ length: cellCount }, (_, cell) => {
    const set = new Set<number>([
      ...rows[rowOf[cell]!]!,
      ...cols[colOf[cell]!]!,
      ...boxes[boxOf[cell]!]!,
    ])
    set.delete(cell)
    return [...set].sort((a, b) => a - b)
  })
  const isPeer = peers.map((list) => {
    const flags = new Uint8Array(cellCount)
    for (const p of list) flags[p] = 1
    return flags
  })

  let allDigits = 0
  for (let d = 1; d <= size; d++) allDigits |= 1 << d

  return {
    size,
    boxRows,
    boxCols,
    cellCount,
    rowOf,
    colOf,
    boxOf,
    rows,
    cols,
    boxes,
    allUnits,
    peers,
    isPeer,
    allDigits,
    digits: range.map((i) => i + 1),
  }
}

const GEOMETRIES = { 9: buildGeometry(9), 6: buildGeometry(6) } as const

export function geometry(size: GridSize): Geometry {
  return GEOMETRIES[size]
}

export function isGridSize(value: unknown): value is GridSize {
  return value === 9 || value === 6
}

/** Grid size for a grid with the given number of cells (81 → 9, 36 → 6). */
export function sizeOfCells(cellCount: number): GridSize {
  if (cellCount === 81) return 9
  if (cellCount === 36) return 6
  throw new Error(`Unsupported grid with ${cellCount} cells`)
}

export function geometryOfCells(cellCount: number): Geometry {
  return GEOMETRIES[sizeOfCells(cellCount)]
}

// --- Classic 9×9 shortcuts (used by classic-only code and tests) --------------------------

export const CLASSIC = GEOMETRIES[9]
export const MINI = GEOMETRIES[6]

export const rowOf = (cell: number): number => Math.floor(cell / 9)
export const colOf = (cell: number): number => cell % 9
export const boxOf = (cell: number): number => CLASSIC.boxOf[cell]!

export const ROWS = CLASSIC.rows
export const COLS = CLASSIC.cols
export const BOXES = CLASSIC.boxes
export const ALL_UNITS = CLASSIC.allUnits
export const PEERS = CLASSIC.peers
export const IS_PEER = CLASSIC.isPeer

export function unitCells(unit: Unit, geo: Geometry = CLASSIC): readonly number[] {
  const list = unit.kind === 'row' ? geo.rows : unit.kind === 'col' ? geo.cols : geo.boxes
  return list[unit.index]!
}

/** Bits 1..9 set (classic). */
export const ALL_DIGITS = CLASSIC.allDigits

const POPCOUNT = new Uint8Array(1024)
for (let i = 1; i < 1024; i++) POPCOUNT[i] = (i & 1) + POPCOUNT[i >> 1]!

export const popcount = (mask: number): number => POPCOUNT[mask & 0x3ff]!

/** Digits (1–9) contained in a candidate mask, ascending. */
export function digitsOf(mask: number): number[] {
  const digits: number[] = []
  for (let d = 1; d <= 9; d++) if (mask & (1 << d)) digits.push(d)
  return digits
}

/** The single digit of a mask with exactly one bit set. */
export function singleDigit(mask: number): number {
  return 31 - Math.clz32(mask)
}

/** All k-element combinations of `items` (k ≤ items.length). */
export function combinations<T>(items: readonly T[], k: number): T[][] {
  const result: T[][] = []
  const current: T[] = []
  const recurse = (start: number): void => {
    if (current.length === k) {
      result.push([...current])
      return
    }
    for (let i = start; i <= items.length - (k - current.length); i++) {
      current.push(items[i]!)
      recurse(i + 1)
      current.pop()
    }
  }
  recurse(0)
  return result
}
