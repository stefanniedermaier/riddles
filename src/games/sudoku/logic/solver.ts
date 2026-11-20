/**
 * Fast exact solver (bitmask backtracking, most constrained cell first).
 * Used to fill random grids and to check that a puzzle has exactly one solution.
 */
import type { Rng } from '@/core/rng'

import { digitsOf, geometry, popcount, sizeOfCells, type Geometry, type GridSize } from './board'
import type { Grid } from './types'

interface SearchState {
  geo: Geometry
  cells: number[]
  rows: Int32Array
  cols: Int32Array
  boxes: Int32Array
}

function setup(grid: readonly number[]): SearchState | null {
  if (grid.length !== 81 && grid.length !== 36) return null
  const geo = geometry(sizeOfCells(grid.length))
  const state: SearchState = {
    geo,
    cells: Array.from(grid),
    rows: new Int32Array(geo.size),
    cols: new Int32Array(geo.size),
    boxes: new Int32Array(geo.size),
  }
  for (let i = 0; i < geo.cellCount; i++) {
    const d = state.cells[i]!
    if (d === 0) continue
    if (d < 0 || d > geo.size) return null
    const bit = 1 << d
    const r = geo.rowOf[i]!
    const c = geo.colOf[i]!
    const b = geo.boxOf[i]!
    if (state.rows[r]! & bit || state.cols[c]! & bit || state.boxes[b]! & bit) return null
    state.rows[r]! |= bit
    state.cols[c]! |= bit
    state.boxes[b]! |= bit
  }
  return state
}

interface SearchResult {
  count: number
  first: Grid | null
}

function search(state: SearchState, limit: number, rng: Rng | undefined, result: SearchResult): void {
  const { geo, cells, rows, cols, boxes } = state
  const { rowOf: ROW_OF, colOf: COL_OF, boxOf: BOX_OF } = geo
  let best = -1
  let bestMask = 0
  let bestCount = 10
  for (let i = 0; i < geo.cellCount; i++) {
    if (cells[i] !== 0) continue
    const mask = geo.allDigits & ~(rows[ROW_OF[i]!]! | cols[COL_OF[i]!]! | boxes[BOX_OF[i]!]!)
    const count = popcount(mask)
    if (count === 0) return // dead end
    if (count < bestCount) {
      best = i
      bestMask = mask
      bestCount = count
      if (count === 1) break
    }
  }

  if (best === -1) {
    result.count++
    if (!result.first) result.first = cells.slice()
    return
  }

  const digits = digitsOf(bestMask)
  if (rng) rng.shuffle(digits)
  const r = ROW_OF[best]!
  const c = COL_OF[best]!
  const b = BOX_OF[best]!
  for (const d of digits) {
    const bit = 1 << d
    cells[best] = d
    rows[r]! |= bit
    cols[c]! |= bit
    boxes[b]! |= bit
    search(state, limit, rng, result)
    cells[best] = 0
    rows[r]! &= ~bit
    cols[c]! &= ~bit
    boxes[b]! &= ~bit
    if (result.count >= limit) return
  }
}

/** Number of solutions, counting stops at `limit`. Contradictory grids have 0. */
export function countSolutions(grid: readonly number[], limit = 2): number {
  const state = setup(grid)
  if (!state) return 0
  const result: SearchResult = { count: 0, first: null }
  search(state, limit, undefined, result)
  return result.count
}

/** First solution found (digit order randomised if `rng` is given), or `null`. */
export function solveGrid(grid: readonly number[], rng?: Rng): Grid | null {
  const state = setup(grid)
  if (!state) return null
  const result: SearchResult = { count: 0, first: null }
  search(state, 1, rng, result)
  return result.first
}

/** A random, completely filled valid grid of the given size (default: classic 9×9). */
export function generateSolvedGrid(rng: Rng, size: GridSize = 9): Grid {
  const grid = solveGrid(new Array<number>(size * size).fill(0), rng)
  if (!grid) throw new Error('Could not fill an empty grid')
  return grid
}

/** `true` if the grid is completely and correctly filled. */
export function isSolvedGrid(grid: readonly number[]): boolean {
  if (grid.length !== 81 && grid.length !== 36) return false
  const size = sizeOfCells(grid.length)
  return grid.every((d) => d >= 1 && d <= size) && setup(grid) !== null
}
