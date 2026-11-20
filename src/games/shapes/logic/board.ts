import { findMatches, matchesAt } from './match'
import {
  CELLS,
  ITEM_KIND,
  SIZE,
  cellAt,
  isItem,
  colOf,
  rowOf,
  type Board,
  type EngineContext,
  type Field,
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

/** A new drop item. */
export function newItem(ctx: EngineContext): Piece {
  return { id: ctx.nextId++, kind: ITEM_KIND, special: 'none' }
}

/**
 * A full board without any match that has at least one valid move.
 * With a field, crate cells stay empty and `itemCells` start with a drop item.
 */
export function createBoard(ctx: EngineContext, field?: Field, itemCells: number[] = []): Board {
  for (;;) {
    const board: Board = new Array<Piece | null>(CELLS).fill(null)
    for (let cell = 0; cell < CELLS; cell++) {
      if (field && field.crates[cell]! > 0) continue
      if (itemCells.includes(cell)) {
        board[cell] = newItem(ctx)
        continue
      }
      const kind = pickKind(ctx, blockedKinds((c) => board[c]?.kind, cell))
      board[cell] = { id: ctx.nextId++, kind, special: 'none' }
    }
    if (findAnyMove(board, field)) return board
  }
}

function swapInPlace(board: Board, a: number, b: number): void {
  const tmp = board[a]!
  board[a] = board[b]!
  board[b] = tmp
}

/**
 * Moving a drop item one row down (swapping it with the piece below) is always allowed,
 * even without a match – it costs a move and guarantees progress.
 */
export function isItemDrop(board: Board, a: number, b: number): boolean {
  const p = board[a]
  const q = board[b]
  if (!p || !q || (isItem(p) && isItem(q))) return false
  return (isItem(p) && b === a + SIZE) || (isItem(q) && a === b + SIZE)
}

/** Whether swapping the two (adjacent) cells is a legal move. */
export function isValidSwap(board: Board, a: number, b: number, field?: Field): boolean {
  const p = board[a]
  const q = board[b]
  if (!p || !q) return false
  if (field && (field.chains[a]! > 0 || field.chains[b]! > 0)) return false
  if (isItemDrop(board, a, b)) return true
  if (p.special === 'prism' || q.special === 'prism') return true
  if (p.special !== 'none' && q.special !== 'none') return true
  if (p.kind === q.kind) return false
  swapInPlace(board, a, b)
  const valid = matchesAt(board, a) || matchesAt(board, b)
  swapInPlace(board, a, b)
  return valid
}

/** All legal moves (each pair once, `a` < `b`), in reading order. */
export function listMoves(board: Board, field?: Field): Move[] {
  const moves: Move[] = []
  for (let cell = 0; cell < CELLS; cell++) {
    if (colOf(cell) < SIZE - 1 && isValidSwap(board, cell, cell + 1, field)) {
      moves.push({ a: cell, b: cell + 1 })
    }
    if (rowOf(cell) < SIZE - 1 && isValidSwap(board, cell, cell + SIZE, field)) {
      moves.push({ a: cell, b: cell + SIZE })
    }
  }
  return moves
}

/** The first legal move in reading order, or `null` on a dead board. */
export function findAnyMove(board: Board, field?: Field): Move | null {
  for (let cell = 0; cell < CELLS; cell++) {
    if (colOf(cell) < SIZE - 1 && isValidSwap(board, cell, cell + 1, field)) {
      return { a: cell, b: cell + 1 }
    }
    if (rowOf(cell) < SIZE - 1 && isValidSwap(board, cell, cell + SIZE, field)) {
      return { a: cell, b: cell + SIZE }
    }
  }
  return null
}

/**
 * Rearranges the movable pieces of a stable board (in place) so that there is no match and
 * at least one move. Piece ids and specials are kept; crates, chained pieces and drop items
 * stay where they are. If random permutations fail, kinds of regular pieces are re-rolled;
 * as a very last resort (boards blocked by obstacles) chains are released.
 */
export function shuffleBoard(board: Board, ctx: EngineContext, field?: Field): void {
  const movable = (cell: number) => {
    const piece = board[cell]
    return piece != null && piece.kind !== ITEM_KIND && !(field && field.chains[cell]! > 0)
  }
  const isOk = () => findMatches(board).length === 0 && findAnyMove(board, field) !== null

  const cells = Array.from({ length: CELLS }, (_, cell) => cell).filter(movable)
  const pieces = cells.map((cell) => board[cell]!)
  for (let attempt = 0; attempt < 200; attempt++) {
    ctx.rng.shuffle(pieces)
    pieces.forEach((piece, i) => (board[cells[i]!] = piece))
    if (isOk()) return
  }
  for (let attempt = 0; ; attempt++) {
    if (attempt === 100 && field) field.chains.fill(0)
    for (let cell = 0; cell < CELLS; cell++) {
      const piece = board[cell]
      if (!piece || !movable(cell) || piece.special !== 'none') continue
      const kind = pickKind(ctx, blockedKinds((c) => (c < cell ? board[c]?.kind : undefined), cell))
      board[cell] = { ...piece, kind }
    }
    if (isOk()) return
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
