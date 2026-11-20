import { describe, expect, it } from 'vitest'

import { generatePuzzle } from '../generator'
import { applyHint, getHint, solutionCells } from '../hints'
import { CROWN, MARK, type CellState } from '../types'

describe('hints', () => {
  const puzzle = generatePuzzle('medium', 21)
  const total = puzzle.size * puzzle.size
  const solution = solutionCells(puzzle)
  const empty = (): CellState[] => new Array<CellState>(total).fill(0)

  it('points out a wrong crown first', () => {
    const cells = empty()
    const wrong = [...Array(total).keys()].find((cell) => !solution.has(cell))!
    cells[wrong] = CROWN
    expect(getHint(puzzle, cells)).toEqual({ kind: 'wrongCrown', cell: wrong })
    expect(applyHint(cells, getHint(puzzle, cells))[wrong]).toBe(0)
  })

  it('points out a mark on a solution cell', () => {
    const cells = empty()
    const cell = [...solution][0]!
    cells[cell] = MARK
    expect(getHint(puzzle, cells)).toEqual({ kind: 'wrongMark', cell })
  })

  it('leads to the solution when applied repeatedly', () => {
    let cells = empty()
    for (let i = 0; i < total * 2; i++) {
      const hint = getHint(puzzle, cells)
      if (hint.kind === 'solved') break
      expect(hint.kind).toBe('step')
      if (hint.kind !== 'step') return
      for (const cell of hint.step.placements) expect(solution.has(cell)).toBe(true)
      for (const cell of hint.step.eliminations) expect(solution.has(cell)).toBe(false)
      cells = applyHint(cells, hint)
    }
    expect(getHint(puzzle, cells).kind).toBe('solved')
    for (const cell of solution) expect(cells[cell]).toBe(CROWN)
  })
})
