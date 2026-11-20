import { findMatches, matchesAt } from './match'
import {
  CELLS,
  SIZE,
  cellAt,
  colOf,
  rowOf,
  type Board,
  type EngineContext,
  type Move,
  type Piece,
} from './types'

export function cloneBoard(board: Board): Board {
  return board.slice()
}

/** A new regular piece of a random kind. */
export function newPiece(ctx: EngineContext): Piece {
  return { id: ctx.nextId++, kind: ctx.rng.int(ctx.kinds), special: 'none' }
}

/** Kinds that would complete a run of three at `cell` given the cells left of and above it. */
function blockedKinds(kindAt: (cell: number) => number | undefined, cell: number): Set<number> {
  const blocked = new Set<number>()
  const row = rowOf(cell)
  const col = colOf(cell)
  if (col >= 2) {
    const k1 = kindAt(cell - 1)
    if (k1 !== undefined && k1 >= 0 && k1 === kindAt(cell - 2)) blocked.add(k1)
  }
  if (row >= 2) {
    const k1 = kindAt(cell - SIZE)
    if (k1 !== undefined && k1 >= 0 && k1 === kindAt(cell - 2 * SIZE)) blocked.add(k1)
  }
  return blocked
}

function pickKind(ctx: EngineContext, blocked: Set<number>): number {
  const options: number[] = []
  for (let kind = 0; kind < ctx.kinds; kind++) if (!blocked.has(kind)) options.push(kind)
  return ctx.rng.pick(options)
}

/** A full board without any match that has at least one valid move. */
export function createBoard(ctx: EngineContext): Board {
  for (;;) {
    const board: Board = new Array<Piece | null>(CELLS).fill(null)
    for (let cell = 0; cell < CELLS; cell++) {
      const kind = pickKind(ctx, blockedKinds((c) => board[c]?.kind, cell))
      board[cell] = { id: ctx.nextId++, kind, special: 'none' }
    }
    if (findAnyMove(board)) return board
  }
}

function swapInPlace(board: Board, a: number, b: number): void {
  const tmp = board[a]!
  board[a] = board[b]!
  board[b] = tmp
}

/** Whether swapping the two (adjacent) cells is a legal move. */
export function isValidSwap(board: Board, a: number, b: number): boolean {
  const p = board[a]
  const q = board[b]
  if (!p || !q) return false
  if (p.special === 'prism' || q.special === 'prism') return true
  if (p.special !== 'none' && q.special !== 'none') return true
  if (p.kind === q.kind) return false
  swapInPlace(board, a, b)
  const valid = matchesAt(board, a) || matchesAt(board, b)
  swapInPlace(board, a, b)
  return valid
}

/** All legal moves (each pair once, `a` < `b`), in reading order. */
export function listMoves(board: Board): Move[] {
  const moves: Move[] = []
  for (let cell = 0; cell < CELLS; cell++) {
    if (colOf(cell) < SIZE - 1 && isValidSwap(board, cell, cell + 1)) {
      moves.push({ a: cell, b: cell + 1 })
    }
    if (rowOf(cell) < SIZE - 1 && isValidSwap(board, cell, cell + SIZE)) {
      moves.push({ a: cell, b: cell + SIZE })
    }
  }
  return moves
}

/** The first legal move in reading order, or `null` on a dead board. */
export function findAnyMove(board: Board): Move | null {
  for (let cell = 0; cell < CELLS; cell++) {
    if (colOf(cell) < SIZE - 1 && isValidSwap(board, cell, cell + 1)) {
      return { a: cell, b: cell + 1 }
    }
    if (rowOf(cell) < SIZE - 1 && isValidSwap(board, cell, cell + SIZE)) {
      return { a: cell, b: cell + SIZE }
    }
  }
  return null
}

/**
 * Rearranges the pieces of a full board (in place) so that there is no match and at least
 * one move. Piece ids and specials are kept. If random permutations fail, kinds of regular
 * pieces are re-rolled as a last resort.
 */
export function shuffleBoard(board: Board, ctx: EngineContext): void {
  const pieces = board.filter((piece): piece is Piece => piece !== null)
  for (let attempt = 0; attempt < 200; attempt++) {
    ctx.rng.shuffle(pieces)
    pieces.forEach((piece, i) => (board[i] = piece))
    if (findMatches(board).length === 0 && findAnyMove(board)) return
  }
  for (;;) {
    for (let cell = 0; cell < CELLS; cell++) {
      const piece = board[cell]!
      if (piece.special !== 'none') continue
      const kind = pickKind(ctx, blockedKinds((c) => (c < cell ? board[c]?.kind : undefined), cell))
      board[cell] = { ...piece, kind }
    }
    if (findMatches(board).length === 0 && findAnyMove(board)) return
  }
}

/** All cells of the given row. */
export function rowCells(row: number): number[] {
  return Array.from({ length: SIZE }, (_, col) => cellAt(row, col))
}

/** All cells of the given column. */
export function colCells(col: number): number[] {
  return Array.from({ length: SIZE }, (_, row) => cellAt(row, col))
}

/** Cells of the (2·radius + 1)² square around `cell`, clipped to the board. */
export function areaCells(cell: number, radius: number): number[] {
  const cells: number[] = []
  const row = rowOf(cell)
  const col = colOf(cell)
  for (let r = Math.max(0, row - radius); r <= Math.min(SIZE - 1, row + radius); r++) {
    for (let c = Math.max(0, col - radius); c <= Math.min(SIZE - 1, col + radius); c++) {
      cells.push(cellAt(r, c))
    }
  }
  return cells
}
