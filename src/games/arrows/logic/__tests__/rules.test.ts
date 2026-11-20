import { describe, expect, it } from 'vitest'

import { generatePuzzle } from '../generator'
import { arrowAt, freshState, hintArrow, isSolved, tapArrow } from '../rules'
import { LIVES } from '../types'
import { chainPuzzle } from './helpers'

describe('arrows rules', () => {
  it('lets a free arrow leave and reports completion', () => {
    const puzzle = chainPuzzle()
    let state = freshState()
    for (const id of [2, 1, 0]) {
      const result = tapArrow(puzzle, state, id)
      expect(result.kind).toBe('exit')
      if (result.kind !== 'exit') return
      state = result.state
      expect(result.solved).toBe(id === 0)
    }
    expect(isSolved(puzzle, state.removed)).toBe(true)
    expect(state.lives).toBe(LIVES)
  })

  it('a blocked arrow bumps into the first arrow in its way and costs a life', () => {
    const puzzle = chainPuzzle()
    const result = tapArrow(puzzle, freshState(), 0)
    expect(result).toMatchObject({
      kind: 'blocked',
      arrow: 0,
      blocker: 1,
      failed: false,
      state: { lives: LIVES - 1 },
    })
  })

  it('fails when the last life is lost and ignores taps afterwards', () => {
    const puzzle = chainPuzzle()
    let state = freshState()
    for (let i = 0; i < LIVES; i++) {
      const result = tapArrow(puzzle, state, 0)
      if (result.kind !== 'blocked') throw new Error('expected blocked')
      state = result.state
      expect(result.failed).toBe(i === LIVES - 1)
    }
    expect(tapArrow(puzzle, state, 2).kind).toBe('none')
  })

  it('ignores removed arrows and finds arrows by cell', () => {
    const puzzle = chainPuzzle()
    expect(arrowAt(puzzle, [], 1)).toBe(0)
    expect(arrowAt(puzzle, [], 4)).toBe(-1)
    expect(arrowAt(puzzle, [2], 8)).toBe(-1)
    expect(tapArrow(puzzle, { removed: [2], lives: 3 }, 2).kind).toBe('none')
  })

  it('hints always point to a removable arrow and solve generated puzzles', () => {
    for (const difficulty of ['easy', 'hard'] as const) {
      const puzzle = generatePuzzle(difficulty, 7)
      let state = freshState()
      for (let step = 0; step < puzzle.arrows.length; step++) {
        const id = hintArrow(puzzle, state.removed)
        expect(id).not.toBeNull()
        const result = tapArrow(puzzle, state, id!)
        expect(result.kind).toBe('exit')
        if (result.kind === 'exit') state = result.state
      }
      expect(isSolved(puzzle, state.removed)).toBe(true)
      expect(hintArrow(puzzle, state.removed)).toBeNull()
    }
  })
})
