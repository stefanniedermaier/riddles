/**
 * Player-side rules: marking cells with the fill/cross tool, straight-line strokes,
 * completion, satisfied clues and mistakes.
 */
import { lineCells, runsOf, sameClue, type LineRef } from './lines'
import { CROSSED, FILLED, UNKNOWN, type CellMark, type NonogramPuzzle, type Tool } from './types'

/** Mark a tap with `tool` gives a cell that currently has `mark` (tapping again clears). */
export function tapResult(mark: CellMark, tool: Tool): CellMark {
  const target = tool === 'fill' ? FILLED : CROSSED
  return mark === target ? UNKNOWN : target
}

export interface Stroke {
  start: number
  /** Mark of the start cell before the stroke: only cells with this mark are painted. */
  from: CellMark
  /** Mark painted onto the cells. */
  to: CellMark
  /** Axis locked by the first move to another cell. */
  axis: 'row' | 'col' | null
  /** Current end of the stroke (cell under the pointer, projected onto the axis). */
  end: number
}

export function beginStroke(cells: readonly CellMark[], start: number, tool: Tool): Stroke {
  const from = cells[start]!
  return { start, from, to: tapResult(from, tool), axis: null, end: start }
}

/** Moves the stroke end towards `cell`, locking the axis on the first move. */
export function moveStroke(stroke: Stroke, cell: number, width: number): Stroke {
  const sr = Math.floor(stroke.start / width)
  const sc = stroke.start % width
  const r = Math.floor(cell / width)
  const c = cell % width
  let axis = stroke.axis
  if (axis === null) {
    if (r === sr && c === sc) return stroke
    axis = Math.abs(c - sc) >= Math.abs(r - sr) ? 'row' : 'col'
  }
  const end = axis === 'row' ? sr * width + c : r * width + sc
  return { ...stroke, axis, end }
}

/** Cells covered by the stroke (start to end, inclusive). */
export function strokeCells(stroke: Stroke, width: number): number[] {
  if (stroke.end === stroke.start) return [stroke.start]
  const step = stroke.axis === 'row' ? 1 : width
  const dir = stroke.end > stroke.start ? step : -step
  const cells: number[] = []
  for (let cell = stroke.start; ; cell += dir) {
    cells.push(cell)
    if (cell === stroke.end) break
  }
  return cells
}

/** Board with the stroke applied (cells that had the start cell's mark get the new mark). */
export function applyStroke(cells: readonly CellMark[], stroke: Stroke, width: number): CellMark[] {
  const next = cells.slice()
  for (const cell of strokeCells(stroke, width)) {
    if (cells[cell] === stroke.from) next[cell] = stroke.to
  }
  return next
}

/** Solved when exactly the solution cells are filled (crosses do not matter). */
export function isSolved(puzzle: NonogramPuzzle, cells: readonly CellMark[]): boolean {
  return puzzle.solution.every((value, cell) => (value === 1) === (cells[cell] === FILLED))
}

/** Whether the filled cells of `line` match its clue. */
export function lineSatisfied(
  puzzle: NonogramPuzzle,
  cells: readonly CellMark[],
  line: LineRef,
): boolean {
  const clue = line.kind === 'row' ? puzzle.rowClues[line.index]! : puzzle.colClues[line.index]!
  const values = lineCells(puzzle.width, puzzle.height, line).map((cell) => (cells[cell] === FILLED ? 1 : 0))
  return sameClue(runsOf(values), clue)
}

/** A mark that contradicts the solution: a fill on an empty cell or a cross on a filled one. */
export function isWrong(puzzle: NonogramPuzzle, cells: readonly CellMark[], cell: number): boolean {
  const mark = cells[cell]
  const value = puzzle.solution[cell]
  return (mark === FILLED && value === 0) || (mark === CROSSED && value === 1)
}

export function wrongCells(puzzle: NonogramPuzzle, cells: readonly CellMark[]): number[] {
  const wrong: number[] = []
  for (let cell = 0; cell < cells.length; cell++) if (isWrong(puzzle, cells, cell)) wrong.push(cell)
  return wrong
}

/** Number of newly wrong marks between two boards (used to count mistakes). */
export function newMistakes(
  puzzle: NonogramPuzzle,
  before: readonly CellMark[],
  after: readonly CellMark[],
): number {
  let count = 0
  for (let cell = 0; cell < after.length; cell++) {
    if (after[cell] !== before[cell] && isWrong(puzzle, after, cell)) count++
  }
  return count
}

/** Share of solution cells that are filled correctly, 0–100. */
export function progressPercent(puzzle: NonogramPuzzle, cells: readonly CellMark[]): number {
  const total = puzzle.solution.reduce<number>((sum, v) => sum + v, 0)
  if (total === 0) return 100
  let correct = 0
  puzzle.solution.forEach((value, cell) => {
    if (value === 1 && cells[cell] === FILLED) correct++
  })
  return Math.round((correct / total) * 100)
}
