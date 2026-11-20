/**
 * Undo history for the Crowns board. Each step stores only the cells it changed together
 * with their previous state, so the history stays small enough to persist with the save.
 */
import type { CellState } from './types'

export interface CellChange {
  cell: number
  /** State of the cell before the step. */
  from: CellState
}

export type UndoStep = CellChange[]

/** Upper bound of stored steps (oldest are dropped). */
export const MAX_UNDO_STEPS = 500

/** Cells that differ between `before` and `after`, with their previous state. */
export function diffCells(before: readonly CellState[], after: readonly CellState[]): UndoStep {
  const step: UndoStep = []
  for (let cell = 0; cell < before.length; cell++) {
    if (before[cell] !== after[cell]) step.push({ cell, from: before[cell] as CellState })
  }
  return step
}

/** Appends a step (ignored if it changed nothing) and enforces the size limit. */
export function pushStep(history: UndoStep[], step: UndoStep): UndoStep[] {
  if (step.length === 0) return history
  const next = [...history, step]
  return next.length > MAX_UNDO_STEPS ? next.slice(next.length - MAX_UNDO_STEPS) : next
}

/** Board after reverting `step`. */
export function revertStep(cells: readonly CellState[], step: UndoStep): CellState[] {
  const next = cells.slice()
  for (const { cell, from } of step) next[cell] = from
  return next
}

/** Validates persisted history data; returns `undefined` if it is malformed. */
export function parseHistory(value: unknown, cellCount: number): UndoStep[] | undefined {
  if (!Array.isArray(value)) return undefined
  const valid = value.every(
    (step) =>
      Array.isArray(step) &&
      step.every(
        (change) =>
          typeof change === 'object' &&
          change !== null &&
          Number.isInteger((change as CellChange).cell) &&
          (change as CellChange).cell >= 0 &&
          (change as CellChange).cell < cellCount &&
          [0, 1, 2].includes((change as CellChange).from),
      ),
  )
  return valid ? (value as UndoStep[]) : undefined
}
