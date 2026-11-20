import type { Rng } from '@/core/rng'

/** Board width and height. */
export const SIZE = 8
export const CELLS = SIZE * SIZE

/** Number of different piece kinds (shapes) that exist. Levels may use fewer. */
export const KIND_COUNT = 6

/** Kind of the colourless prism special – never part of a regular match. */
export const PRISM_KIND = -1

export type Special = 'none' | 'line-h' | 'line-v' | 'burst' | 'prism'

export interface Piece {
  /** Unique per run; used as rendering key so DOM elements are reused while animating. */
  id: number
  /** 0 … KIND_COUNT − 1, or `PRISM_KIND`. */
  kind: number
  special: Special
}

/** Row-major 8×8 board, index = row * SIZE + col. `null` only appears mid-resolution. */
export type Board = (Piece | null)[]

/** Mutable state the engine needs to create new pieces deterministically. */
export interface EngineContext {
  rng: Rng
  /** Number of kinds in play (5 or 6). */
  kinds: number
  /** Next free piece id. */
  nextId: number
}

export interface Move {
  a: number
  b: number
}

export const rowOf = (cell: number): number => Math.floor(cell / SIZE)
export const colOf = (cell: number): number => cell % SIZE
export const cellAt = (row: number, col: number): number => row * SIZE + col

export function areAdjacent(a: number, b: number): boolean {
  if (a < 0 || b < 0 || a >= CELLS || b >= CELLS) return false
  const dr = Math.abs(rowOf(a) - rowOf(b))
  const dc = Math.abs(colOf(a) - colOf(b))
  return dr + dc === 1
}

export function isMatchable(piece: Piece | null | undefined): piece is Piece {
  return piece != null && piece.kind >= 0
}

/** Game modes. */
export const MODES = ['zen', 'time', 'levels'] as const
export type Mode = (typeof MODES)[number]
