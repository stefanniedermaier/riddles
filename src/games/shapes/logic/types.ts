import type { Rng } from '@/core/rng'

/** Board width and height. */
export const SIZE = 8
export const CELLS = SIZE * SIZE

/** Number of different piece kinds (shapes) that exist. Levels may use fewer. */
export const KIND_COUNT = 6

/** Kind of the colourless prism special – never part of a regular match. */
export const PRISM_KIND = -1

/** Kind of a drop item (levels): never matches, cannot be cleared, collected at the bottom. */
export const ITEM_KIND = -2

export type Special = 'none' | 'line-h' | 'line-v' | 'burst' | 'prism'

export interface Piece {
  /** Unique per run; used as rendering key so DOM elements are reused while animating. */
  id: number
  /** 0 … KIND_COUNT − 1, or `PRISM_KIND`. */
  kind: number
  special: Special
}

/**
 * Row-major 8×8 board, index = row * SIZE + col. `null` appears mid-resolution and – in
 * levels – permanently on cells occupied by a crate.
 */
export type Board = (Piece | null)[]

/**
 * Obstacles and objectives of a level, stored per cell (arrays of length `CELLS`).
 * Zen and Time runs have no field.
 */
export interface Field {
  /** Remaining hit points of the crate on a cell (0 = no crate). A crate cell has no piece. */
  crates: number[]
  /** 1 = target tile that still has to be cleared (the piece on it must be cleared). */
  targets: number[]
  /** 1 = the piece on this cell is chained: it cannot be swapped and does not fall. */
  chains: number[]
  /** Drop items that still have to enter the board from the top. */
  itemsPending: number
  /** Maximum number of drop items on the board at the same time. */
  maxItems: number
}

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

export function isItem(piece: Piece | null | undefined): piece is Piece {
  return piece != null && piece.kind === ITEM_KIND
}

/** Cells that never move: crates and chained pieces. */
export function isFixedCell(field: Field | undefined, cell: number): boolean {
  return field !== undefined && (field.crates[cell]! > 0 || field.chains[cell]! > 0)
}

export function cloneField(field: Field): Field {
  return {
    crates: field.crates.slice(),
    targets: field.targets.slice(),
    chains: field.chains.slice(),
    itemsPending: field.itemsPending,
    maxItems: field.maxItems,
  }
}

/** A field without any obstacle. */
export function emptyField(): Field {
  const zeros = () => new Array<number>(CELLS).fill(0)
  return { crates: zeros(), targets: zeros(), chains: zeros(), itemsPending: 0, maxItems: 0 }
}

const count = (cells: number[]) => cells.reduce((sum, value) => sum + (value > 0 ? 1 : 0), 0)

/** Remaining obstacles of a field. */
export function fieldCounts(field: Field): { crates: number; targets: number; chains: number } {
  return { crates: count(field.crates), targets: count(field.targets), chains: count(field.chains) }
}

/** Game modes. */
export const MODES = ['zen', 'time', 'levels'] as const
export type Mode = (typeof MODES)[number]
