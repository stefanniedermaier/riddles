/**
 * Undo history: each step stores the changed cells with their previous marks, so the history
 * stays small enough to persist with the save.
 */
import type { CellMark, UndoStep } from './types'

/** Upper bound of stored steps (oldest are dropped). */
export const MAX_UNDO_STEPS = 500

export function diffCells(before: readonly CellMark[], after: readonly CellMark[]): UndoStep {
  const step: UndoStep = []
  for (let cell = 0; cell < before.length; cell++) {
    if (before[cell] !== after[cell]) step.push({ cell, from: before[cell]! })
  }
  return step
}

export function pushStep(history: readonly UndoStep[], step: UndoStep): UndoStep[] {
  if (step.length === 0) return history.slice()
  const next = [...history, step]
  return next.length > MAX_UNDO_STEPS ? next.slice(next.length - MAX_UNDO_STEPS) : next
}

export function revertStep(cells: readonly CellMark[], step: UndoStep): CellMark[] {
  const next = cells.slice()
  for (const { cell, from } of step) next[cell] = from
  return next
}
