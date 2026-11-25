/**
 * Hints: first point out mistakes, otherwise explain the next logical step.
 */
import { createGeometry, type Geometry } from './geometry'
import { findStep, LogicBoard, type LogicStep } from './logic'
import { isSolved } from './rules'
import { CROWN, EMPTY, MARK, type CellState, type CrownsPuzzle } from './types'

export type Hint =
  | { kind: 'wrongCrown'; cell: number }
  | { kind: 'wrongMark'; cell: number }
  | { kind: 'step'; step: LogicStep }
  | { kind: 'solved' }
  | { kind: 'stuck' }

export function solutionCells(puzzle: CrownsPuzzle): Set<number> {
  return new Set(puzzle.solution.map((col, row) => row * puzzle.size + col))
}

/** Logic board from the player's cells: marks are eliminations, crowns are placed. */
function boardFromCells(geo: Geometry, cells: readonly CellState[]): LogicBoard {
  const board = new LogicBoard(geo)
  cells.forEach((state, cell) => {
    if (state === MARK) board.eliminate(cell)
  })
  cells.forEach((state, cell) => {
    if (state === CROWN) board.place(cell)
  })
  return board
}

export function getHint(puzzle: CrownsPuzzle, cells: readonly CellState[]): Hint {
  const geo = createGeometry(puzzle.size, puzzle.regions)
  if (isSolved(geo, cells)) return { kind: 'solved' }

  const solution = solutionCells(puzzle)
  for (let cell = 0; cell < cells.length; cell++) {
    if (cells[cell] === CROWN && !solution.has(cell)) return { kind: 'wrongCrown', cell }
  }
  for (let cell = 0; cell < cells.length; cell++) {
    if (cells[cell] === MARK && solution.has(cell)) return { kind: 'wrongMark', cell }
  }

  const step = findStep(boardFromCells(geo, cells))
  return step ? { kind: 'step', step } : { kind: 'stuck' }
}

/** Returns the cells after applying a hint (fixing a mistake or performing the step). */
export function applyHint(cells: readonly CellState[], hint: Hint): CellState[] {
  const next = cells.slice()
  switch (hint.kind) {
    case 'wrongCrown':
    case 'wrongMark':
      next[hint.cell] = EMPTY
      break
    case 'step':
      for (const cell of hint.step.eliminations) if (next[cell] === EMPTY) next[cell] = MARK
      for (const cell of hint.step.placements) next[cell] = CROWN
      break
    default:
      break
  }
  return next
}

/** Whether a cell contradicts the solution: a crown off the solution or a mark on it. */
export function isWrongCell(solution: ReadonlySet<number>, cells: readonly CellState[], cell: number): boolean {
  return (cells[cell] === CROWN && !solution.has(cell)) || (cells[cell] === MARK && solution.has(cell))
}

/** All cells that contradict the solution (used by "Check"). */
export function wrongCells(puzzle: CrownsPuzzle, cells: readonly CellState[]): number[] {
  const solution = solutionCells(puzzle)
  const wrong: number[] = []
  for (let cell = 0; cell < cells.length; cell++) if (isWrongCell(solution, cells, cell)) wrong.push(cell)
  return wrong
}
