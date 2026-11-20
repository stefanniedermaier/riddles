/**
 * Hints: first point out wrong marks; otherwise show the next line-logic deduction.
 */
import type { LineRef } from './lines'
import type { Known } from './lineSolver'
import { wrongCells } from './rules'
import { nextLineStep } from './solver'
import { CROSSED, FILLED, UNKNOWN, type CellMark, type NonogramPuzzle } from './types'

export type Hint =
  | { kind: 'wrong'; cells: number[] }
  | { kind: 'step'; line: LineRef; fills: number[]; crosses: number[] }
  | { kind: 'none' }

export function getHint(puzzle: NonogramPuzzle, cells: readonly CellMark[]): Hint {
  const wrong = wrongCells(puzzle, cells)
  if (wrong.length > 0) return { kind: 'wrong', cells: wrong }

  // All marks are correct here, so they can serve as known cells.
  const known: Known[] = cells.map((mark) => (mark === FILLED ? 1 : mark === CROSSED ? 0 : -1))
  const step = nextLineStep(puzzle, known)
  if (step) return { kind: 'step', ...step }

  // Line logic is exhausted only if every cell is known; fill what is left from the solution.
  const fills = puzzle.solution.flatMap((v, cell) => (v === 1 && cells[cell] !== FILLED ? [cell] : []))
  if (fills.length > 0) return { kind: 'step', line: { kind: 'row', index: Math.floor(fills[0]! / puzzle.width) }, fills, crosses: [] }
  return { kind: 'none' }
}

/** Board after applying a hint (wrong marks are cleared, a step is filled in). */
export function applyHint(cells: readonly CellMark[], hint: Hint): CellMark[] {
  const next = cells.slice()
  if (hint.kind === 'wrong') for (const cell of hint.cells) next[cell] = UNKNOWN
  else if (hint.kind === 'step') {
    for (const cell of hint.fills) next[cell] = FILLED
    for (const cell of hint.crosses) next[cell] = CROSSED
  }
  return next
}
