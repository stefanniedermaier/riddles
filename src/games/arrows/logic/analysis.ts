/**
 * Board analysis: which arrow can leave, what blocks it, and how deep the chain of
 * dependencies is (used for grading, hints and tests).
 */
import { DELTAS, type Arrow, type ArrowsPuzzle, type Direction } from './types'

/** Cells from (excluding) `head` to the board edge in direction `dir`. */
export function rayCells(size: number, head: number, dir: Direction): number[] {
  const [dr, dc] = DELTAS[dir]
  const cells: number[] = []
  let row = Math.floor(head / size) + dr
  let col = (head % size) + dc
  while (row >= 0 && row < size && col >= 0 && col < size) {
    cells.push(row * size + col)
    row += dr
    col += dc
  }
  return cells
}

export const headOf = (arrow: Arrow): number => arrow.cells[arrow.cells.length - 1]!

/** Arrow id per cell (-1 = empty) for the arrows that are still on the board. */
export function occupancy(puzzle: ArrowsPuzzle, removed: Iterable<number> = []): Int32Array {
  const gone = new Set(removed)
  const occ = new Int32Array(puzzle.size * puzzle.size).fill(-1)
  for (const arrow of puzzle.arrows) {
    if (gone.has(arrow.id)) continue
    for (const cell of arrow.cells) occ[cell] = arrow.id
  }
  return occ
}

/** First arrow in the way of `arrow`, or null when it can leave. */
export function blockerOf(puzzle: ArrowsPuzzle, occ: Int32Array, arrow: Arrow): number | null {
  for (const cell of rayCells(puzzle.size, headOf(arrow), arrow.dir)) {
    const id = occ[cell]!
    if (id >= 0 && id !== arrow.id) return id
  }
  return null
}

/** Ids of the arrows that can leave right now (ascending). */
export function freeArrows(puzzle: ArrowsPuzzle, removed: Iterable<number> = []): number[] {
  const gone = new Set(removed)
  const occ = occupancy(puzzle, gone)
  return puzzle.arrows
    .filter((arrow) => !gone.has(arrow.id) && blockerOf(puzzle, occ, arrow) === null)
    .map((arrow) => arrow.id)
}

/** All arrows on the ray of each arrow (they all have to leave first). */
export function dependencies(puzzle: ArrowsPuzzle): number[][] {
  const occ = occupancy(puzzle)
  return puzzle.arrows.map((arrow) => {
    const deps = new Set<number>()
    for (const cell of rayCells(puzzle.size, headOf(arrow), arrow.dir)) {
      const id = occ[cell]!
      if (id >= 0 && id !== arrow.id) deps.add(id)
    }
    return [...deps]
  })
}

/**
 * Longest dependency chain (number of arrows on it). Returns `Infinity` if the dependencies
 * contain a cycle (unsolvable board).
 */
export function dependencyDepth(puzzle: ArrowsPuzzle): number {
  const deps = dependencies(puzzle)
  const depth = new Array<number>(deps.length).fill(0)
  const state = new Uint8Array(deps.length) // 0 new, 1 visiting, 2 done
  let cyclic = false

  const visit = (id: number): number => {
    if (state[id] === 2) return depth[id]!
    if (state[id] === 1) {
      cyclic = true
      return 0
    }
    state[id] = 1
    let best = 0
    for (const dep of deps[id]!) best = Math.max(best, visit(dep))
    state[id] = 2
    depth[id] = best + 1
    return depth[id]!
  }

  let max = 0
  for (let id = 0; id < deps.length; id++) max = Math.max(max, visit(id))
  return cyclic ? Infinity : max
}

/**
 * Removes free arrows until none is left or none can move. Removing an arrow only ever frees
 * cells, so this greedy order succeeds exactly when the board is solvable.
 */
export function solveOrder(puzzle: ArrowsPuzzle, removed: Iterable<number> = []): number[] | null {
  const gone = new Set(removed)
  const occ = occupancy(puzzle, gone)
  const order: number[] = []
  let progress = true
  while (gone.size < puzzle.arrows.length && progress) {
    progress = false
    for (const arrow of puzzle.arrows) {
      if (gone.has(arrow.id) || blockerOf(puzzle, occ, arrow) !== null) continue
      gone.add(arrow.id)
      order.push(arrow.id)
      for (const cell of arrow.cells) occ[cell] = -1
      progress = true
    }
  }
  return gone.size === puzzle.arrows.length ? order : null
}
