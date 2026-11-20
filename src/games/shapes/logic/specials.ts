import { areaCells, colCells, rowCells } from './board'
import {
  CELLS,
  ITEM_KIND,
  SIZE,
  colOf,
  rowOf,
  type Board,
  type EngineContext,
  type Piece,
  type Special,
} from './types'

/** Kind with the most pieces on the board (ties → lowest kind), or `null` if none. */
export function mostCommonKind(board: Board): number | null {
  const counts = new Map<number, number>()
  for (const piece of board) {
    if (piece && piece.kind >= 0) counts.set(piece.kind, (counts.get(piece.kind) ?? 0) + 1)
  }
  let best: number | null = null
  let bestCount = 0
  for (const [kind, count] of [...counts].sort((x, y) => x[0] - y[0])) {
    if (count > bestCount) {
      best = kind
      bestCount = count
    }
  }
  return best
}

export function cellsOfKind(board: Board, kind: number): number[] {
  const cells: number[] = []
  for (let cell = 0; cell < CELLS; cell++) if (board[cell]?.kind === kind) cells.push(cell)
  return cells
}

/** Cells hit when the special at `cell` is triggered (by a match or another special). */
export function effectCells(board: Board, cell: number, piece: Piece): number[] {
  switch (piece.special) {
    case 'line-h':
      return rowCells(rowOf(cell))
    case 'line-v':
      return colCells(colOf(cell))
    case 'burst':
      return areaCells(cell, 1)
    case 'prism': {
      const kind = mostCommonKind(board)
      return kind === null ? [] : cellsOfKind(board, kind)
    }
    default:
      return []
  }
}

/** What a swap of two special pieces (or a prism with anything) does. */
export interface ComboSeeds {
  /** Cells cleared directly by the combo. */
  cells: number[]
  /** Pieces consumed by the combo – they are cleared without triggering their own effect. */
  consumed: number[]
  /** Pieces converted into specials before clearing (prism + special). */
  convert?: { cell: number; special: Special }[]
}

const isLine = (special: Special) => special === 'line-h' || special === 'line-v'

/**
 * Detects a combo swap. `board` is the board *after* swapping; the piece moved by the
 * player now sits on `target`, the other one on `source`.
 */
export function comboFor(
  board: Board,
  source: number,
  target: number,
  ctx: EngineContext,
): ComboSeeds | null {
  const moved = board[target]
  const other = board[source]
  if (!moved || !other) return null
  const sm = moved.special
  const so = other.special

  if (sm === 'prism' && so === 'prism') {
    return { cells: Array.from({ length: CELLS }, (_, i) => i), consumed: [moved.id, other.id] }
  }

  if (sm === 'prism' || so === 'prism') {
    const [prismCell, prism, partner] = sm === 'prism' ? [target, moved, other] : [source, other, moved]
    if (partner.kind === ITEM_KIND) {
      // Drop items have no kind to clear – the prism clears the most common kind instead.
      const kind = mostCommonKind(board)
      return { cells: [prismCell, ...(kind === null ? [] : cellsOfKind(board, kind))], consumed: [prism.id] }
    }
    const kindCells = cellsOfKind(board, partner.kind)
    if (partner.special === 'none') {
      return { cells: [prismCell, ...kindCells], consumed: [prism.id] }
    }
    // Every piece of the partner's kind becomes that special and triggers.
    const convert = kindCells.map((cell) => ({
      cell,
      special: isLine(partner.special)
        ? ctx.rng.chance(0.5)
          ? ('line-h' as const)
          : ('line-v' as const)
        : partner.special,
    }))
    return { cells: [prismCell, ...kindCells], consumed: [prism.id], convert }
  }

  if (sm !== 'none' && so !== 'none') {
    const consumed = [moved.id, other.id]
    if (isLine(sm) && isLine(so)) {
      return { cells: union(rowCells(rowOf(target)), colCells(colOf(target))), consumed }
    }
    if (sm === 'burst' && so === 'burst') {
      return { cells: areaCells(target, 2), consumed }
    }
    // Burst + line: three rows and three columns.
    const cells: number[] = []
    for (let d = -1; d <= 1; d++) {
      const row = rowOf(target) + d
      const col = colOf(target) + d
      if (row >= 0 && row < SIZE) cells.push(...rowCells(row))
      if (col >= 0 && col < SIZE) cells.push(...colCells(col))
    }
    return { cells: union(cells), consumed }
  }

  return null
}

function union(...lists: number[][]): number[] {
  return [...new Set(lists.flat())].sort((a, b) => a - b)
}
