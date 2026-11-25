import { describe, expect, it } from 'vitest'

import { MAX_UNDO_STEPS, diffCells, isCellHistory, pushStep, revertStep } from '../history'

type CellState = 0 | 1 | 2
const isState = (value: unknown): value is CellState => value === 0 || value === 1 || value === 2

describe('cell undo history', () => {
  it('records only changed cells and reverts them', () => {
    const before: CellState[] = [0, 1, 2, 0]
    const after: CellState[] = [1, 1, 0, 0]
    const step = diffCells(before, after)
    expect(step).toEqual([
      { cell: 0, from: 0 },
      { cell: 2, from: 2 },
    ])
    expect(revertStep(after, step)).toEqual(before)
  })

  it('ignores empty steps and caps the history', () => {
    expect(pushStep([], [])).toEqual([])
    let history = pushStep([], [{ cell: 0, from: 0 }])
    expect(history).toHaveLength(1)
    for (let i = 0; i < MAX_UNDO_STEPS + 10; i++) history = pushStep(history, [{ cell: 1, from: 1 }])
    expect(history).toHaveLength(MAX_UNDO_STEPS)
    expect(history[0]).toEqual([{ cell: 1, from: 1 }])
    // Non-array steps (Sudoku) are always kept.
    expect(pushStep([{ a: 1 }], { a: 2 })).toEqual([{ a: 1 }, { a: 2 }])
  })

  it('reverts several steps in reverse order back to the start', () => {
    let cells: CellState[] = [0, 0, 0]
    let history = pushStep([], diffCells<CellState>(cells, [1, 0, 0]))
    cells = [1, 0, 0]
    history = pushStep(history, diffCells(cells, [2, 1, 1]))
    cells = [2, 1, 1]
    for (const step of history.toReversed()) cells = revertStep(cells, step)
    expect(cells).toEqual([0, 0, 0])
  })

  it('validates persisted history', () => {
    expect(isCellHistory([[{ cell: 3, from: 2 }]], 4, isState)).toBe(true)
    expect(isCellHistory([[{ cell: 4, from: 0 }]], 4, isState)).toBe(false)
    expect(isCellHistory([[{ cell: 1, from: 3 }]], 4, isState)).toBe(false)
    expect(isCellHistory('nope', 4, isState)).toBe(false)
  })
})
