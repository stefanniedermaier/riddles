/**
 * Undo history for cell boards: each step stores only the cells it changed with their
 * previous state, so the history stays small enough to persist with the save.
 * Used by Stars and Nonogram; Sudoku keeps its own step format but the same size limit.
 */
import { isInt } from './guards'

interface CellChange<T> {
  cell: number
  /** State of the cell before the step. */
  from: T
}

export type CellUndoStep<T> = CellChange<T>[]

/** Upper bound of stored steps (oldest are dropped). */
export const MAX_UNDO_STEPS = 500

/** Cells that differ between `before` and `after`, with their previous state. */
export function diffCells<T>(before: readonly T[], after: readonly T[]): CellUndoStep<T> {
  const step: CellUndoStep<T> = []
  for (let cell = 0; cell < before.length; cell++) {
    if (before[cell] !== after[cell]) step.push({ cell, from: before[cell]! })
  }
  return step
}

/** Appends a step (an empty cell step is ignored) and drops the oldest beyond the limit. */
export function pushStep<S>(history: readonly S[], step: S): S[] {
  if (Array.isArray(step) && step.length === 0) return history.slice()
  const next = [...history, step]
  return next.length > MAX_UNDO_STEPS ? next.slice(next.length - MAX_UNDO_STEPS) : next
}

/** Board after reverting `step`. */
export function revertStep<T>(cells: readonly T[], step: CellUndoStep<T>): T[] {
  const next = cells.slice()
  for (const { cell, from } of step) next[cell] = from
  return next
}

/** True if `value` is a valid persisted history for a board of `cellCount` cells. */
export function isCellHistory<T>(
  value: unknown,
  cellCount: number,
  isState: (state: unknown) => state is T,
): value is CellUndoStep<T>[] {
  return (
    Array.isArray(value) &&
    value.every(
      (step) =>
        Array.isArray(step) &&
        step.every((change: unknown) => {
          if (typeof change !== 'object' || change === null) return false
          const { cell, from } = change as Partial<CellChange<unknown>>
          return isInt(cell) && cell >= 0 && cell < cellCount && isState(from)
        }),
    )
  )
}
