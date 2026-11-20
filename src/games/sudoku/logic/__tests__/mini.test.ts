import { describe, expect, it } from 'vitest'

import { MINI, geometryOfCells } from '../board'
import { MINI_PROFILES, generatePuzzle } from '../generator'
import { gradePuzzle } from '../grader'
import { getHint } from '../hints'
import { countSolutions, isSolvedGrid, solveGrid } from '../solver'
import { applyStep, createLogicState } from '../techniques'
import { MINI_DIFFICULTIES, isSudokuPuzzle, modeOfPuzzle } from '../types'

const SEEDS = [1, 7, 42, 2024, 99_991]

describe('mini geometry (6×6, boxes of 2 rows × 3 columns)', () => {
  it('has six boxes of 2×3 cells', () => {
    expect(MINI.boxes).toHaveLength(6)
    expect(MINI.boxes[0]).toEqual([0, 1, 2, 6, 7, 8])
    expect(MINI.boxes[1]).toEqual([3, 4, 5, 9, 10, 11])
    expect(MINI.boxes[5]).toEqual([27, 28, 29, 33, 34, 35])
    expect(MINI.boxOf[14]).toBe(2) // row 2, col 2
  })

  it('every cell has 12 peers', () => {
    expect(MINI.peers.every((peers) => peers.length === 12)).toBe(true)
    expect(geometryOfCells(36)).toBe(MINI)
  })

  it('solves and counts solutions of 6×6 grids', () => {
    const solution = solveGrid(new Array<number>(36).fill(0))!
    expect(isSolvedGrid(solution)).toBe(true)
    expect(countSolutions(new Array<number>(36).fill(0))).toBe(2)
  })
})

describe('mini generator', () => {
  for (const difficulty of MINI_DIFFICULTIES) {
    it(`creates unique, logic-solvable ${difficulty} puzzles`, () => {
      const profile = MINI_PROFILES[difficulty]
      for (const seed of SEEDS) {
        const puzzle = generatePuzzle(difficulty, seed, { size: 6 })
        expect(isSudokuPuzzle(puzzle)).toBe(true)
        expect(modeOfPuzzle(puzzle)).toBe('mini')
        expect(puzzle.difficulty).toBe(difficulty)
        expect(puzzle.givens).toHaveLength(36)
        expect(isSolvedGrid(puzzle.solution)).toBe(true)
        expect(puzzle.givens.every((d, cell) => d === 0 || d === puzzle.solution[cell])).toBe(true)
        expect(countSolutions(puzzle.givens)).toBe(1)

        const grade = gradePuzzle(puzzle.givens)
        expect(grade.solved).toBe(true)
        expect(grade.hardestLevel).toBeGreaterThanOrEqual(profile.minLevel ?? profile.level)
        expect(grade.hardestLevel).toBeLessThanOrEqual(profile.level)

        const clues = puzzle.givens.filter((d) => d !== 0).length
        expect(clues).toBeLessThanOrEqual(profile.maxGivens)
        expect(clues).toBeGreaterThanOrEqual(profile.floor)
      }
    })
  }

  it('gets harder with fewer givens from easy to hard', () => {
    const clues = (difficulty: (typeof MINI_DIFFICULTIES)[number]) =>
      generatePuzzle(difficulty, 5, { size: 6 }).givens.filter((d) => d !== 0).length
    expect(clues('easy')).toBeGreaterThan(clues('medium'))
    expect(clues('medium')).toBeGreaterThan(clues('hard'))
  })

  it('is deterministic per seed', () => {
    expect(generatePuzzle('hard', 123, { size: 6 })).toEqual(generatePuzzle('hard', 123, { size: 6 }))
  })

  it('maps expert to hard for the mini grid', () => {
    expect(generatePuzzle('expert', 3, { size: 6 }).difficulty).toBe('hard')
  })
})

describe('mini hints', () => {
  it('reports wrong entries and otherwise a placement matching the solution', () => {
    const puzzle = generatePuzzle('medium', 11, { size: 6 })
    const values = puzzle.givens.slice()
    const empty = values.indexOf(0)
    values[empty] = (puzzle.solution[empty]! % 6) + 1
    const mistake = getHint(values, puzzle.solution)
    expect(mistake).toEqual({ kind: 'mistake', cells: [empty] })

    values[empty] = 0
    const hint = getHint(values, puzzle.solution)
    expect(hint.kind).toBe('step')
    const placement = hint.kind === 'step' ? hint.placement : null
    expect(placement && puzzle.solution[placement.cell]).toBe(placement?.digit)
  })

  it('repeated hints solve the puzzle', () => {
    const puzzle = generatePuzzle('hard', 21, { size: 6 })
    const state = createLogicState(puzzle.givens)!
    for (let i = 0; i < 100 && state.values.includes(0); i++) {
      const hint = getHint(state.values, puzzle.solution)
      expect(hint.kind).toBe('step')
      if (hint.kind !== 'step') break
      for (const step of hint.steps) applyStep(state, step)
    }
    expect(state.values).toEqual(puzzle.solution)
  })
})
