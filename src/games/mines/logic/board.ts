/**
 * Board geometry: the eight neighbours of a cell and the numbers shown on revealed cells.
 */
import type { MinesPuzzle } from './types'

const neighbourCache = new Map<string, number[][]>()

/** The (up to) eight neighbours of every cell, cached per board size. */
export function neighbourTable(width: number, height: number): number[][] {
  const key = `${width}x${height}`
  let table = neighbourCache.get(key)
  if (!table) {
    table = []
    for (let cell = 0; cell < width * height; cell++) {
      const row = Math.floor(cell / width)
      const col = cell % width
      const list: number[] = []
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue
          const r = row + dr
          const c = col + dc
          if (r >= 0 && r < height && c >= 0 && c < width) list.push(r * width + c)
        }
      }
      table.push(list)
    }
    neighbourCache.set(key, table)
  }
  return table
}

/** Number of adjacent mines per cell (mine cells get their own count, too). */
export function adjacentCounts(width: number, height: number, mines: Iterable<number>): Int8Array {
  const counts = new Int8Array(width * height)
  const table = neighbourTable(width, height)
  for (const mine of mines) for (const n of table[mine]!) counts[n]! += 1
  return counts
}

interface PuzzleInfo {
  counts: Int8Array
  isMine: Uint8Array
}

const infoCache = new WeakMap<MinesPuzzle, PuzzleInfo>()

/** Adjacent counts and a mine lookup for a puzzle (cached per puzzle object). */
export function puzzleInfo(puzzle: MinesPuzzle): PuzzleInfo {
  let info = infoCache.get(puzzle)
  if (!info) {
    const isMine = new Uint8Array(puzzle.width * puzzle.height)
    for (const mine of puzzle.mines) isMine[mine] = 1
    info = { counts: adjacentCounts(puzzle.width, puzzle.height, puzzle.mines), isMine }
    infoCache.set(puzzle, info)
  }
  return info
}

/**
 * Cells revealed by opening `cell`: the cell itself and, while cells without adjacent mines
 * are found, their neighbours (iterative flood fill). `open(c)` tells whether a cell may be
 * opened (covered, not flagged, not already collected).
 */
export function floodFill(
  width: number,
  height: number,
  counts: ArrayLike<number>,
  cell: number,
  open: (cell: number) => boolean,
): number[] {
  const table = neighbourTable(width, height)
  const seen = new Set<number>([cell])
  const result: number[] = []
  const stack = [cell]
  while (stack.length > 0) {
    const current = stack.pop()!
    result.push(current)
    if (counts[current] !== 0) continue
    for (const n of table[current]!) {
      if (!seen.has(n) && open(n)) {
        seen.add(n)
        stack.push(n)
      }
    }
  }
  return result
}
