import { describe, expect, it } from 'vitest'

import { generatePuzzle } from '../generator'
import { findNextStep } from '../grader'
import { getHint } from '../hints'
import { applyStep, createLogicState } from '../techniques'
import { EASY_PUZZLE, EASY_SOLUTION } from './helpers'

describe('hints', () => {
  it('reports wrong entries first', () => {
    const values = EASY_PUZZLE.slice()
    const empty = values.indexOf(0)
    values[empty] = (EASY_SOLUTION[empty]! % 9) + 1
    expect(getHint(values, EASY_SOLUTION)).toEqual({ kind: 'mistake', cells: [empty] })
  })

  it('returns a placement that matches the solution', () => {
    const hint = getHint(EASY_PUZZLE, EASY_SOLUTION)
    expect(hint.kind).toBe('step')
    if (hint.kind !== 'step') return
    expect(hint.placement.digit).toBe(EASY_SOLUTION[hint.placement.cell])
    expect(hint.key).toBeNull() // singles need no preparation
  })

  it('reports a solved board', () => {
    expect(getHint(EASY_SOLUTION, EASY_SOLUTION)).toEqual({ kind: 'solved' })
  })

  it('explains preparatory eliminations when no single is available', () => {
    const puzzle = generatePuzzle('expert', 31)
    const state = createLogicState(puzzle.givens)!
    // Play all singles until the solver gets stuck.
    for (let step = findNextStep(state, 1); step; step = findNextStep(state, 1)) {
      applyStep(state, step)
    }
    const hint = getHint(state.values, puzzle.solution)
    expect(hint.kind).toBe('step')
    if (hint.kind !== 'step') return
    expect(hint.key).not.toBeNull()
    expect(hint.steps[hint.steps.length - 1]!.placements[0]).toEqual(hint.placement)
    expect(puzzle.solution[hint.placement.cell]).toBe(hint.placement.digit)
  })
})
