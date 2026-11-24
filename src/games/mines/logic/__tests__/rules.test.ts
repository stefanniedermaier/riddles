import { describe, expect, it } from 'vitest'

import { applyHint, getHint } from '../hints'
import {
  chord,
  flagAllMines,
  initialCells,
  isSolved,
  minesLeft,
  reveal,
  toggleFlag,
  wrongFlags,
} from '../rules'
import { generatePuzzle } from '../generator'
import { COVERED, FLAGGED, REVEALED, type CellState } from '../types'
import { boardFrom } from './helpers'

//  S . . .
//  . . 1 1
//  . . 1 *
const small = () => boardFrom(['S...', '..11', '..1*'])

describe('mines rules', () => {
  it('opens the start area with a flood fill', () => {
    const cells = initialCells(small())
    expect(cells.filter((c) => c === REVEALED)).toHaveLength(11)
    expect(cells[11]).toBe(COVERED)
    expect(isSolved(small(), cells)).toBe(true)
  })

  it('reveals numbers, ignores flags and reports a mine hit', () => {
    const puzzle = boardFrom(['S.*', '...', '*..'])
    const cells = new Array<CellState>(9).fill(COVERED)
    const opened = reveal(puzzle, cells, 1)
    expect(opened).toMatchObject({ kind: 'ok', revealed: [1] })
    const flagged = toggleFlag(cells, 2)!
    expect(flagged[2]).toBe(FLAGGED)
    expect(reveal(puzzle, flagged, 2).kind).toBe('none')
    expect(toggleFlag(flagged, 2)![2]).toBe(COVERED)
    const hit = reveal(puzzle, cells, 6)
    expect(hit).toMatchObject({ kind: 'hit', mine: 6 })
  })

  it('chords a satisfied number and can hit a mine with a wrong flag', () => {
    const puzzle = boardFrom(['S.*', '...', '*..'])
    let cells = new Array<CellState>(9).fill(COVERED)
    cells = (reveal(puzzle, cells, 4) as { cells: CellState[] }).cells // centre shows 2
    expect(chord(puzzle, cells, 4).kind).toBe('none') // no flags yet
    const right = toggleFlag(toggleFlag(cells, 2)!, 6)!
    const result = chord(puzzle, right, 4)
    expect(result.kind).toBe('ok')
    expect(isSolved(puzzle, (result as { cells: CellState[] }).cells)).toBe(true)

    const wrong = toggleFlag(toggleFlag(cells, 2)!, 8)!
    expect(chord(puzzle, wrong, 4)).toMatchObject({ kind: 'hit', mine: 6 })
    expect(wrongFlags(puzzle, wrong)).toEqual([8])
    expect(minesLeft(puzzle, wrong)).toBe(0)
  })

  it('flags all mines after a win', () => {
    const puzzle = small()
    expect(flagAllMines(puzzle, initialCells(puzzle))[11]).toBe(FLAGGED)
  })
})

describe('mines hints', () => {
  it('points out wrong flags first and removes them', () => {
    const puzzle = generatePuzzle('easy', 5)
    const cells = initialCells(puzzle)
    const safeCovered = cells.findIndex((c, cell) => c === COVERED && !puzzle.mines.includes(cell))
    const flagged = toggleFlag(cells, safeCovered)!
    const hint = getHint(puzzle, flagged)
    expect(hint).toEqual({ kind: 'wrong', cells: [safeCovered] })
    expect(applyHint(puzzle, flagged, hint)).toEqual(cells)
  })

  for (const difficulty of ['easy', 'expert'] as const) {
    it(`solves a whole ${difficulty} board with correct hints only`, () => {
      const puzzle = generatePuzzle(difficulty, 9)
      let cells = initialCells(puzzle)
      for (let i = 0; i < 500 && !isSolved(puzzle, cells); i++) {
        const hint = getHint(puzzle, cells)
        expect(hint.kind).toBe('step')
        if (hint.kind !== 'step') break
        for (const cell of hint.step.safe) expect(puzzle.mines).not.toContain(cell)
        for (const cell of hint.step.mines) expect(puzzle.mines).toContain(cell)
        cells = applyHint(puzzle, cells, hint)
      }
      expect(isSolved(puzzle, cells)).toBe(true)
    })
  }
})
