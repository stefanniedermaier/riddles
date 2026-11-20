import { describe, expect, it } from 'vitest'

import { generatePuzzle } from '../generator'
import { createGeometry, unitId } from '../geometry'
import { CANDIDATE, finders, findStep, LogicBoard, PLACED, solveLogically } from '../logic'
import type { Difficulty } from '../types'

// prettier-ignore
const regions = [
  0, 0, 0, 1, 1,
  2, 2, 2, 1, 1,
  2, 3, 3, 3, 1,
  2, 3, 4, 4, 4,
  2, 2, 4, 4, 4,
]
const geo = createGeometry(5, regions)

describe('logic techniques', () => {
  it('places a crown in the last free cell of a unit', () => {
    const board = new LogicBoard(geo)
    for (const cell of [1, 2]) board.eliminate(cell) // region 0 keeps only cell 0
    const step = findStep(board, 1)
    expect(step).toMatchObject({ technique: 'lastCell', placements: [0], level: 1 })
    expect(step?.units).toEqual([{ kind: 'region', index: 0 }])
  })

  it('confines a region to a line', () => {
    const board = new LogicBoard(geo)
    const step = findStep(board, 2)
    expect(step).toMatchObject({
      technique: 'confinement',
      eliminations: [3, 4],
      units: [{ kind: 'region', index: 0 }],
      lines: [{ kind: 'row', index: 0 }],
    })
  })

  it('eliminates cells whose crown would empty another unit', () => {
    const board = new LogicBoard(geo)
    // Leave region 4 only the two cells 17 and 18 (row 3, columns 2–3).
    for (const cell of [19, 22, 23, 24]) board.eliminate(cell)
    const forcedCells = new Set<number>()
    for (let step = finders.forced(board); step; step = finders.forced(board)) {
      const cell = step.eliminations[0]!
      const emptied = unitId(5, step.units[0]!)
      const blocked = new Set([cell, ...geo.peers[cell]!])
      expect(board.candidates(emptied).every((c) => blocked.has(c))).toBe(true)
      forcedCells.add(cell)
      board.apply(step)
    }
    // Cells touching both (12, 13) or sharing their row (15, 16) are ruled out.
    for (const cell of [12, 13, 15, 16]) expect(forcedCells.has(cell)).toBe(true)
  })

  it('places every crown of a generated puzzle correctly and never eliminates a solution cell', () => {
    for (const difficulty of ['easy', 'medium', 'hard', 'expert'] as Difficulty[]) {
      for (const seed of [11, 12]) {
        const puzzle = generatePuzzle(difficulty, seed)
        const g = createGeometry(puzzle.size, puzzle.regions)
        const solution = new Set(puzzle.solution.map((col, row) => row * puzzle.size + col))
        const result = solveLogically(g)
        expect(result.solved).toBe(true)
        for (const step of result.steps) {
          for (const cell of step.placements) expect(solution.has(cell)).toBe(true)
          for (const cell of step.eliminations) expect(solution.has(cell)).toBe(false)
        }
      }
    }
  })

  it('needs group confinement for expert puzzles', () => {
    const puzzle = generatePuzzle('expert', 3)
    const g = createGeometry(puzzle.size, puzzle.regions)
    expect(puzzle.hardestLevel).toBe(4)
    expect(solveLogically(g, 3).solved).toBe(false)
    const full = solveLogically(g, 4)
    expect(full.solved).toBe(true)
    expect(full.steps.some((step) => step.technique === 'groupConfinement')).toBe(true)
  })

  it('tracks board state', () => {
    const board = new LogicBoard(geo)
    board.place(12)
    expect(board.state[12]).toBe(PLACED)
    expect(board.state[0]).toBe(CANDIDATE)
    expect(board.candidates(unitId(5, { kind: 'row', index: 2 }))).toEqual([])
    expect(board.hasCrown(unitId(5, { kind: 'region', index: 3 }))).toBe(true)
    expect(board.crownCount()).toBe(1)
  })
})
