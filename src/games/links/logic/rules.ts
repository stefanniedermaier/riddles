/**
 * Drawing rules for Links (pure functions, used by the UI and the tests).
 *
 * A player path is empty or a chain of orthogonally adjacent cells that starts at one of its
 * colour's dots. While dragging, a *stroke* edits one colour's path; other colours' paths are
 * derived from their state at stroke start and cut where the stroke crosses them – so a cut
 * line comes back when the stroke is pulled back again.
 */
import { areAdjacent } from './grid'
import type { LinksPuzzle } from './types'

/** Colour of the dot at each cell, or -1. */
export function dotColors(puzzle: LinksPuzzle): Int16Array {
  const dots = new Int16Array(puzzle.size * puzzle.size).fill(-1)
  for (const e of puzzle.endpoints) {
    dots[e.a] = e.color
    dots[e.b] = e.color
  }
  return dots
}

/** Colour whose path covers each cell, or -1. */
export function cellOwners(size: number, paths: readonly (readonly number[])[]): Int16Array {
  const owners = new Int16Array(size * size).fill(-1)
  paths.forEach((path, color) => path.forEach((cell) => (owners[cell] = color)))
  return owners
}

/** A path connects its colour when it runs from one dot to the other. */
export function isConnected(puzzle: LinksPuzzle, color: number, path: readonly number[]): boolean {
  const { a, b } = puzzle.endpoints[color]!
  if (path.length < 2) return false
  const first = path[0]
  const last = path[path.length - 1]
  return (first === a && last === b) || (first === b && last === a)
}

export function connectedCount(puzzle: LinksPuzzle, paths: readonly (readonly number[])[]): number {
  return paths.filter((path, color) => isConnected(puzzle, color, path)).length
}

/** Number of cells covered by lines. */
export function coveredCells(paths: readonly (readonly number[])[]): number {
  return paths.reduce((sum, path) => sum + path.length, 0)
}

export function isSolved(puzzle: LinksPuzzle, paths: readonly (readonly number[])[]): boolean {
  return (
    connectedCount(puzzle, paths) === puzzle.endpoints.length &&
    coveredCells(paths) === puzzle.size * puzzle.size
  )
}

export function samePath(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((cell, i) => cell === b[i])
}

/** Same line regardless of the direction it was drawn in. */
export function sameLine(a: readonly number[], b: readonly number[]): boolean {
  return samePath(a, b) || samePath(a, b.slice().reverse())
}

// --- Strokes -----------------------------------------------------------------------

export interface Stroke {
  color: number
  /** All paths when the stroke started. */
  base: number[][]
  /** The path being drawn. */
  path: number[]
}

/**
 * Starts a stroke at `cell`:
 * - on a dot: continue the colour's open line if it ends there, otherwise start anew there;
 * - on a line: continue that line from this cell (the rest of it is removed);
 * - elsewhere: no stroke.
 */
export function beginStroke(
  puzzle: LinksPuzzle,
  paths: readonly (readonly number[])[],
  cell: number,
): Stroke | null {
  const base = paths.map((p) => p.slice())
  const dot = dotColors(puzzle)[cell]!
  if (dot >= 0) {
    const current = base[dot]!
    const continues =
      current.length > 0 && current[current.length - 1] === cell && !isConnected(puzzle, dot, current)
    return { color: dot, base, path: continues ? current.slice() : [cell] }
  }
  const owner = cellOwners(puzzle.size, base)[cell]!
  if (owner < 0) return null
  const current = base[owner]!
  return { color: owner, base, path: current.slice(0, current.indexOf(cell) + 1) }
}

/**
 * Moves the stroke's head to `cell`. Non-adjacent cells (fast drags) are reached step by step
 * along the row, then the column. Returns `true` if the path changed.
 */
export function extendStroke(puzzle: LinksPuzzle, stroke: Stroke, cell: number): boolean {
  const { size } = puzzle
  const head = stroke.path[stroke.path.length - 1]!
  if (cell === head) return false
  if (!areAdjacent(size, head, cell)) {
    let changed = false
    let current = head
    const tr = Math.floor(cell / size)
    const tc = cell % size
    while (current !== cell) {
      const r = Math.floor(current / size)
      const c = current % size
      const next = c !== tc ? current + Math.sign(tc - c) : current + Math.sign(tr - r) * size
      if (!extendStroke(puzzle, stroke, next)) break
      changed = true
      current = next
    }
    return changed
  }

  // Pulling back over the own line shortens it.
  const index = stroke.path.indexOf(cell)
  if (index >= 0) {
    stroke.path.length = index + 1
    return true
  }
  // A connected line cannot grow further.
  if (isConnected(puzzle, stroke.color, stroke.path)) return false
  const dot = dotColors(puzzle)[cell]!
  if (dot >= 0 && dot !== stroke.color) return false
  stroke.path.push(cell)
  return true
}

/** Current paths during/after a stroke: other lines are cut where the stroke crosses them. */
export function strokePaths(stroke: Stroke): number[][] {
  const used = new Set(stroke.path)
  return stroke.base.map((path, color) => {
    if (color === stroke.color) return stroke.path.slice()
    const cut = path.findIndex((cell) => used.has(cell))
    return cut === -1 ? path.slice() : path.slice(0, cut)
  })
}

// --- Hints -------------------------------------------------------------------------

/** First colour whose line is not exactly the solution line (unconnected colours first). */
export function hintColor(puzzle: LinksPuzzle, paths: readonly (readonly number[])[]): number | null {
  const wrong = puzzle.solution
    .map((solution, color) => ({ color, ok: sameLine(paths[color] ?? [], solution) }))
    .filter((entry) => !entry.ok)
    .map((entry) => entry.color)
  if (wrong.length === 0) return null
  const open = wrong.find((color) => !isConnected(puzzle, color, paths[color] ?? []))
  return open ?? wrong[0]!
}

/** Lays the solution line of `color`; other lines are cut where they are in its way. */
export function applyHint(
  puzzle: LinksPuzzle,
  paths: readonly (readonly number[])[],
  color: number,
): number[][] {
  return strokePaths({
    color,
    base: paths.map((p) => p.slice()),
    path: puzzle.solution[color]!.slice(),
  })
}

// --- Moves -------------------------------------------------------------------------

/** A move is counted when a stroke changes a different colour than the previous one. */
export function countMove(
  moves: number,
  lastColor: number | null,
  color: number,
): { moves: number; lastColor: number } {
  return { moves: color === lastColor ? moves : moves + 1, lastColor: color }
}
