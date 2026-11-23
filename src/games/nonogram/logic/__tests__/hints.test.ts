import { describe, expect, it } from 'vitest'

import { generatePuzzle } from '../generator'
import { applyHint, getHint } from '../hints'
import { isSolved } from '../rules'
import { CROSSED, FILLED, UNKNOWN, type CellMark } from '../types'

describe('nonogram hints', () => {
  it('points out wrong marks first', () => {
    const puzzle = generatePuzzle('easy', 3)
    const cells = new Array<CellMark>(25).fill(UNKNOWN)
    const empty = puzzle.solution.indexOf(0)
    const filled = puzzle.solution.indexOf(1)
    cells[empty] = FILLED
    cells[filled] = CROSSED
    const hint = getHint(puzzle, cells)
    expect(hint).toEqual({ kind: 'wrong', cells: [empty, filled].sort((a, b) => a - b) })
    expect(applyHint(cells, hint).every((m) => m === UNKNOWN)).toBe(true)
  })

  it('steps are consistent with the solution and solve every difficulty', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const puzzle = generatePuzzle(difficulty, 7)
      let cells = new Array<CellMark>(puzzle.width * puzzle.height).fill(UNKNOWN)
      for (let i = 0; i < 400 && !isSolved(puzzle, cells); i++) {
        const hint = getHint(puzzle, cells)
        expect(hint.kind).toBe('step')
        if (hint.kind !== 'step') break
        for (const cell of hint.fills) expect(puzzle.solution[cell]).toBe(1)
        for (const cell of hint.crosses) expect(puzzle.solution[cell]).toBe(0)
        cells = applyHint(cells, hint)
      }
      expect(isSolved(puzzle, cells)).toBe(true)
    }
  })
})
