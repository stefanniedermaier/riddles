import { describe, expect, it } from 'vitest'

import { diffCells, pushStep, revertStep, MAX_UNDO_STEPS } from '../history'
import { cluesFor } from '../lines'
import {
  applyStroke,
  beginStroke,
  isSolved,
  lineSatisfied,
  moveStroke,
  newMistakes,
  progressPercent,
  strokeCells,
  tapResult,
  wrongCells,
} from '../rules'
import { CROSSED, FILLED, UNKNOWN, type CellMark, type NonogramPuzzle } from '../types'

// 3×3 plus sign.
const solution: (0 | 1)[] = [0, 1, 0, 1, 1, 1, 0, 1, 0]
const puzzle: NonogramPuzzle = {
  seed: 0,
  difficulty: 'easy',
  width: 3,
  height: 3,
  solution,
  ...cluesFor(solution, 3, 3),
  passes: 1,
}
const empty = (): CellMark[] => new Array<CellMark>(9).fill(UNKNOWN)

describe('nonogram rules', () => {
  it('taps toggle with the active tool', () => {
    expect(tapResult(UNKNOWN, 'fill')).toBe(FILLED)
    expect(tapResult(FILLED, 'fill')).toBe(UNKNOWN)
    expect(tapResult(CROSSED, 'fill')).toBe(FILLED)
    expect(tapResult(UNKNOWN, 'cross')).toBe(CROSSED)
    expect(tapResult(CROSSED, 'cross')).toBe(UNKNOWN)
  })

  it('strokes lock to the first axis and only paint cells like the start cell', () => {
    const cells = empty()
    cells[2] = CROSSED
    let stroke = beginStroke(cells, 0, 'fill')
    stroke = moveStroke(stroke, 1, 3)
    expect(stroke.axis).toBe('row')
    // Moving diagonally afterwards stays in the row.
    stroke = moveStroke(stroke, 5, 3)
    expect(strokeCells(stroke, 3)).toEqual([0, 1, 2])
    const after = applyStroke(cells, stroke, 3)
    expect(after.slice(0, 3)).toEqual([FILLED, FILLED, CROSSED]) // the cross is kept

    // Column stroke, backwards, erasing fills.
    const filled = after.slice()
    filled[3] = FILLED
    let erase = beginStroke(filled, 3, 'fill')
    erase = moveStroke(erase, 0, 3)
    expect(erase.axis).toBe('col')
    expect(applyStroke(filled, erase, 3).filter((m, i) => i === 0 || i === 3)).toEqual([UNKNOWN, UNKNOWN])
  })

  it('is solved when exactly the solution is filled, crosses do not matter', () => {
    const cells = solution.map((v) => (v ? FILLED : UNKNOWN)) as CellMark[]
    expect(isSolved(puzzle, cells)).toBe(true)
    cells[0] = CROSSED
    expect(isSolved(puzzle, cells)).toBe(true)
    cells[0] = FILLED
    expect(isSolved(puzzle, cells)).toBe(false)
  })

  it('knows satisfied lines, wrong marks, mistakes and progress', () => {
    const cells = empty()
    cells[1] = FILLED
    expect(lineSatisfied(puzzle, cells, { kind: 'row', index: 0 })).toBe(true)
    expect(lineSatisfied(puzzle, cells, { kind: 'col', index: 1 })).toBe(false)
    const next = cells.slice()
    next[0] = FILLED // wrong fill
    next[4] = CROSSED // wrong cross
    expect(wrongCells(puzzle, next)).toEqual([0, 4])
    expect(newMistakes(puzzle, cells, next)).toBe(2)
    expect(progressPercent(puzzle, cells)).toBe(20)
  })

  it('undo history stores changed cells and reverts them', () => {
    const before = empty()
    const after = before.slice()
    after[4] = FILLED
    after[0] = CROSSED
    const step = diffCells(before, after)
    expect(step).toEqual([
      { cell: 0, from: UNKNOWN },
      { cell: 4, from: UNKNOWN },
    ])
    expect(revertStep(after, step)).toEqual(before)
    expect(pushStep([], [])).toEqual([])
    let history = pushStep([], step)
    for (let i = 0; i < MAX_UNDO_STEPS + 5; i++) history = pushStep(history, step)
    expect(history).toHaveLength(MAX_UNDO_STEPS)
  })
})
