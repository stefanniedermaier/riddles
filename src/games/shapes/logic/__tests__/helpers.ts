import { createRng } from '@/core/rng'

import { findMatches } from '../match'
import { CELLS, SIZE, type Board, type EngineContext, type Piece, type Special } from '../types'

/** Kind letters used in test boards. */
const KINDS = 'ROYGBP'

/**
 * A full board without matches: kind = (col + 2·row) mod 6 never repeats three times in a
 * row or column. Individual cells can be overridden with `set`.
 */
export function patternBoard(): Board {
  const board: Board = []
  for (let cell = 0; cell < CELLS; cell++) {
    const row = Math.floor(cell / SIZE)
    const col = cell % SIZE
    board.push({ id: cell + 1, kind: (col + 2 * row) % 6, special: 'none' })
  }
  return board
}

/**
 * Parses a token like `R`, `Rh` (line-h), `Rv` (line-v), `Rx` (burst) or `*` (prism).
 */
export function piece(token: string, id: number): Piece {
  if (token === '*') return { id, kind: -1, special: 'prism' }
  const kind = KINDS.indexOf(token[0]!)
  if (kind < 0) throw new Error(`bad token ${token}`)
  const suffix = token[1]
  const special: Special =
    suffix === 'h' ? 'line-h' : suffix === 'v' ? 'line-v' : suffix === 'x' ? 'burst' : 'none'
  return { id, kind, special }
}

/** Overrides cells (by `[row, col]`) of a board in place; returns the board. */
export function set(board: Board, cells: [number, number, string][]): Board {
  for (const [row, col, token] of cells) {
    const cell = row * SIZE + col
    board[cell] = piece(token, board[cell]?.id ?? 1000 + cell)
  }
  return board
}

export function context(seed = 1, kinds = 6, nextId = 10_000): EngineContext {
  return { rng: createRng(seed), kinds, nextId }
}

export const at = (row: number, col: number) => row * SIZE + col

/** Asserts the structural invariants of a stable board. */
export function isStable(board: Board): boolean {
  return board.length === CELLS && board.every((p) => p !== null) && findMatches(board).length === 0
}
