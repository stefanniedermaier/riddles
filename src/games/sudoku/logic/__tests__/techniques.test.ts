import { describe, expect, it } from 'vitest'

import { BOXES, COLS, ROWS } from '../board'
import { gradePuzzle } from '../grader'
import {
  createLogicState,
  findClaiming,
  findHiddenPair,
  findHiddenSingle,
  findNakedPair,
  findNakedSingle,
  findPointing,
  findSwordfish,
  findXWing,
  findXYWing,
} from '../techniques'
import { EASY_PUZZLE, openState, removeCandidate, setCandidates } from './helpers'

const elim = (cells: number[], digit: number) => cells.map((cell) => ({ cell, digit }))

describe('techniques', () => {
  it('naked single', () => {
    const values = new Array<number>(81).fill(0)
    for (let c = 0; c < 8; c++) values[c] = c + 1
    const step = findNakedSingle(createLogicState(values)!)
    expect(step?.technique).toBe('nakedSingle')
    expect(step?.placements).toEqual([{ cell: 8, digit: 9 }])
  })

  it('hidden single', () => {
    const state = openState()
    removeCandidate(state, BOXES[0]!.filter((cell) => cell !== 10), 5)
    const step = findHiddenSingle(state)
    expect(step?.placements).toEqual([{ cell: 10, digit: 5 }])
    expect(step?.units).toEqual([{ kind: 'box', index: 0 }])
  })

  it('pointing', () => {
    const state = openState()
    removeCandidate(state, [9, 10, 11, 18, 19, 20], 4) // box 0: 4 only in row 0
    const step = findPointing(state)
    expect(step?.technique).toBe('pointing')
    expect(step?.eliminations).toEqual(elim([3, 4, 5, 6, 7, 8], 4))
    expect(step?.coverUnits).toEqual([{ kind: 'row', index: 0 }])
  })

  it('claiming (box/line reduction)', () => {
    const state = openState()
    removeCandidate(state, [2, 3, 4, 5, 6, 7, 8], 7) // row 0: 7 only in cells 0, 1
    const step = findClaiming(state)
    expect(step?.technique).toBe('claiming')
    expect(step?.units).toEqual([{ kind: 'row', index: 0 }])
    expect(step?.eliminations).toEqual(elim([9, 10, 11, 18, 19, 20], 7))
  })

  it('naked pair', () => {
    const state = openState()
    setCandidates(state, 0, [1, 2])
    setCandidates(state, 1, [1, 2])
    const step = findNakedPair(state)
    expect(step?.technique).toBe('nakedPair')
    expect(step?.focusCells).toEqual([0, 1])
    expect(step?.digits).toEqual([1, 2])
    expect(step?.eliminations).toContainEqual({ cell: 2, digit: 1 })
    expect(step?.eliminations.some(({ cell }) => cell === 0 || cell === 1)).toBe(false)
  })

  it('hidden pair', () => {
    const state = openState()
    const others = BOXES[0]!.filter((cell) => cell !== 0 && cell !== 1)
    removeCandidate(state, others, 8)
    removeCandidate(state, others, 9)
    const step = findHiddenPair(state)
    expect(step?.technique).toBe('hiddenPair')
    expect(step?.digits).toEqual([8, 9])
    expect(step?.focusCells).toEqual([0, 1])
    expect(step?.eliminations).toHaveLength(14) // digits 1–7 from both cells
  })

  it('x-wing', () => {
    const state = openState()
    for (const row of [1, 4]) {
      removeCandidate(state, ROWS[row]!.filter((cell) => cell % 9 !== 2 && cell % 9 !== 6), 5)
    }
    const step = findXWing(state)
    expect(step?.technique).toBe('xWing')
    expect(step?.units).toEqual([
      { kind: 'row', index: 1 },
      { kind: 'row', index: 4 },
    ])
    expect(step?.coverUnits).toEqual([
      { kind: 'col', index: 2 },
      { kind: 'col', index: 6 },
    ])
    const expected = [...COLS[2]!, ...COLS[6]!].filter((cell) => ![1, 4].includes(Math.floor(cell / 9)))
    expect(step?.eliminations.map((e) => e.cell).sort((a, b) => a - b)).toEqual(
      expected.sort((a, b) => a - b),
    )
  })

  it('swordfish', () => {
    const state = openState()
    const allowed: Record<number, number[]> = { 0: [1, 4], 3: [4, 7], 6: [1, 7] }
    for (const [row, cols] of Object.entries(allowed)) {
      removeCandidate(state, ROWS[Number(row)]!.filter((cell) => !cols.includes(cell % 9)), 6)
    }
    expect(findXWing(state)).toBeNull()
    const step = findSwordfish(state)
    expect(step?.technique).toBe('swordfish')
    expect(step?.coverUnits.map((u) => u.index)).toEqual([1, 4, 7])
    expect(step?.eliminations.every(({ cell, digit }) => digit === 6 && [1, 4, 7].includes(cell % 9))).toBe(true)
    expect(step?.eliminations).toHaveLength(18)
  })

  it('xy-wing', () => {
    const state = openState()
    setCandidates(state, 0, [1, 2]) // pivot
    setCandidates(state, 4, [1, 3]) // pincer in row 0
    setCandidates(state, 18, [2, 3]) // pincer in box 0
    const step = findXYWing(state)
    expect(step?.technique).toBe('xyWing')
    expect(step?.focusCells).toEqual([0, 4, 18])
    expect(step?.digits).toEqual([1, 2, 3])
    expect(step?.eliminations.map((e) => e.cell).sort((a, b) => a - b)).toEqual([1, 2, 21, 22, 23])
  })

  it('grades a singles-only puzzle as level 1', () => {
    const grade = gradePuzzle(EASY_PUZZLE)
    expect(grade.solved).toBe(true)
    expect(grade.hardestLevel).toBe(1)
    expect(grade.steps).toBe(EASY_PUZZLE.filter((d) => d === 0).length)
  })

  it('does not solve puzzles with multiple solutions', () => {
    const sparse = EASY_PUZZLE.map((d, i) => (i < 27 ? d : 0))
    expect(gradePuzzle(sparse).solved).toBe(false)
  })
})
