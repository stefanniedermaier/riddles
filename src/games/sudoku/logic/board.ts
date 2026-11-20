/** Grid geometry helpers and bitmask utilities. */
import type { Unit } from './types'

export const rowOf = (cell: number): number => Math.floor(cell / 9)
export const colOf = (cell: number): number => cell % 9
export const boxOf = (cell: number): number =>
  Math.floor(rowOf(cell) / 3) * 3 + Math.floor(colOf(cell) / 3)

const range9 = [0, 1, 2, 3, 4, 5, 6, 7, 8]

export const ROWS: readonly number[][] = range9.map((r) => range9.map((c) => r * 9 + c))
export const COLS: readonly number[][] = range9.map((c) => range9.map((r) => r * 9 + c))
export const BOXES: readonly number[][] = range9.map((b) =>
  range9.map((i) => (Math.floor(b / 3) * 3 + Math.floor(i / 3)) * 9 + (b % 3) * 3 + (i % 3)),
)

export function unitCells(unit: Unit): readonly number[] {
  const list = unit.kind === 'row' ? ROWS : unit.kind === 'col' ? COLS : BOXES
  return list[unit.index]!
}

/** Units in the order humans usually scan them: boxes, rows, columns. */
export const ALL_UNITS: readonly Unit[] = [
  ...range9.map((index) => ({ kind: 'box' as const, index })),
  ...range9.map((index) => ({ kind: 'row' as const, index })),
  ...range9.map((index) => ({ kind: 'col' as const, index })),
]

/** The 20 peers (same row, column or box) of every cell. */
export const PEERS: readonly number[][] = Array.from({ length: 81 }, (_, cell) => {
  const peers = new Set<number>([
    ...ROWS[rowOf(cell)]!,
    ...COLS[colOf(cell)]!,
    ...BOXES[boxOf(cell)]!,
  ])
  peers.delete(cell)
  return [...peers].sort((a, b) => a - b)
})

/** `IS_PEER[a][b]` – fast peer test. */
export const IS_PEER: readonly Uint8Array[] = PEERS.map((peers) => {
  const flags = new Uint8Array(81)
  for (const p of peers) flags[p] = 1
  return flags
})

/** Bits 1..9 set. */
export const ALL_DIGITS = 0x3fe

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
