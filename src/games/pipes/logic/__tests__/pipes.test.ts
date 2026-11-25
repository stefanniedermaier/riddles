import { describe, expect, it } from 'vitest'

import { generatePuzzle } from '../generator'
import { MIXED, colors, flow, getHint, isRight, isSolved, masks, opposite, rotate, step } from '../rules'
import { DIFFICULTIES, DIRECTIONS, DOWN, LEFT, RIGHT, SIZES, SOURCE_COUNT, UP, isPipesPuzzle, isPipesSave, sourcesOf, type PipesPuzzle } from '../types'

const edgesOf = (puzzle: PipesPuzzle) =>
  puzzle.solution.reduce((sum, mask) => sum + DIRECTIONS.filter((dir) => mask & dir).length, 0) / 2

describe('pipes rules', () => {
  it('rotates masks clockwise', () => {
    expect(rotate(UP, 1)).toBe(RIGHT)
    expect(rotate(UP | RIGHT, 1)).toBe(RIGHT | DOWN)
    expect(rotate(LEFT, 1)).toBe(UP)
    expect(rotate(UP | DOWN, 2)).toBe(UP | DOWN)
    expect(rotate(UP | RIGHT | DOWN, 4)).toBe(UP | RIGHT | DOWN)
    expect(opposite(LEFT)).toBe(RIGHT)
  })

  it('lets water flow only through matching ends and accepts any closed network', () => {
    // 2×1: source ─ end. Solution: source points right, the end points left.
    const puzzle: PipesPuzzle = {
      seed: 0,
      difficulty: 'easy',
      width: 2,
      height: 1,
      source: 0,
      solution: [RIGHT, LEFT],
      scramble: [0, 1],
    }
    expect(flow(puzzle, [0, 1])).toEqual([true, false])
    expect(isSolved(puzzle, [0, 1])).toBe(false)
    expect(isSolved(puzzle, [0, 0])).toBe(true)
    // 2×2 ring of bends: a different but closed arrangement also counts as solved.
    const ring: PipesPuzzle = {
      seed: 0,
      difficulty: 'easy',
      width: 2,
      height: 2,
      source: 0,
      solution: [RIGHT | DOWN, LEFT | DOWN, UP | RIGHT, UP | LEFT],
      scramble: [0, 0, 0, 0],
    }
    expect(isSolved(ring, [0, 0, 0, 0])).toBe(true)
    expect(step(2, 2, 0, UP)).toBe(-1)
  })
})

describe('pipes generator', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`builds a valid ${difficulty} tree that starts scrambled`, () => {
      for (const seed of [1, 2, 3]) {
        const puzzle = generatePuzzle(difficulty, seed)
        expect(isPipesPuzzle(puzzle)).toBe(true)
        expect(puzzle.width).toBe(SIZES[difficulty].width)
        expect(puzzle.height).toBe(SIZES[difficulty].height)
        const zero = puzzle.solution.map(() => 0)
        expect(isSolved(puzzle, zero)).toBe(true) // connected, no open end
        expect(sourcesOf(puzzle)).toHaveLength(SOURCE_COUNT[difficulty])
        expect(edgesOf(puzzle)).toBe(puzzle.solution.length - SOURCE_COUNT[difficulty]) // one tree per source
        expect(isSolved(puzzle, puzzle.scramble)).toBe(false)
        const off = puzzle.solution.filter((_, cell) => !isRight(puzzle, puzzle.scramble, cell)).length
        expect(off).toBeGreaterThanOrEqual(puzzle.solution.length / 2)
        expect(difficulty !== 'easy' || !puzzle.solution.includes(15)).toBe(true)
      }
    })
  }

  it('is deterministic per seed', () => {
    expect(generatePuzzle('hard', 7)).toEqual(generatePuzzle('hard', 7))
    expect(generatePuzzle('hard', 7)).not.toEqual(generatePuzzle('hard', 8))
  })

  it('harder levels branch more', () => {
    const tees = (difficulty: (typeof DIFFICULTIES)[number]) =>
      [1, 2, 3, 4, 5].reduce((sum, seed) => {
        const p = generatePuzzle(difficulty, seed)
        return sum + p.solution.filter((m) => DIRECTIONS.filter((d) => m & d).length >= 3).length / p.solution.length
      }, 0)
    expect(tees('hard')).toBeGreaterThan(tees('easy'))
  })
})

describe('pipes with several sources', () => {
  // 3×1: source 1 ─ end piece ─ source 2; the end piece joins the left source only.
  const puzzle: PipesPuzzle = {
    seed: 0,
    difficulty: 'easy',
    width: 3,
    height: 1,
    source: 0,
    sources: [0, 2],
    solution: [RIGHT, LEFT, LEFT],
    scramble: [0, 0, 0],
  }

  it('colours water per source and marks mixed water', () => {
    expect(colors(puzzle, [0, 0, 0])).toEqual([0, 0, 1])
    expect(isSolved(puzzle, [0, 0, 0])).toBe(false) // the right source's end is open
    // With a straight piece in the middle both sources connect: the water mixes.
    const straight: PipesPuzzle = { ...puzzle, solution: [RIGHT, LEFT | RIGHT, LEFT] }
    expect(colors(straight, [0, 0, 0])).toEqual([MIXED, MIXED, MIXED])
    expect(flow(straight, [0, 0, 0])).toEqual([false, false, false])
    expect(isSolved(straight, [0, 0, 0])).toBe(false)
  })

  it('generates spread-out sources with balanced networks that are solved by the solution', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const p = generatePuzzle('expert', seed)
      const [a, b, c] = sourcesOf(p)
      const dist = (x: number, y: number) =>
        Math.abs(Math.floor(x / p.width) - Math.floor(y / p.width)) + Math.abs((x % p.width) - (y % p.width))
      expect(Math.min(dist(a!, b!), dist(a!, c!), dist(b!, c!))).toBeGreaterThanOrEqual(4)
      const zero = p.solution.map(() => 0)
      const water = colors(p, zero)
      expect(water.every((color) => color >= 0)).toBe(true)
      for (const index of [0, 1, 2]) expect(water.filter((color) => color === index).length).toBeGreaterThanOrEqual(10)
    }
  })

  it('accepts saves without `sources` and rejects boards of the wrong size', () => {
    const base = generatePuzzle('medium', 3)
    const save = { puzzle: base, turns: base.scramble, locked: [], moves: 0, elapsedMs: 0, hintsUsed: 0, undo: [] }
    expect(isPipesSave(save)).toBe(true)
    expect(isPipesSave({ ...save, puzzle: { ...base, difficulty: 'expert' } })).toBe(false)
    expect(isPipesPuzzle({ ...base, sources: [base.source + 1] })).toBe(false)
  })
})

describe('pipes hints', () => {
  it('unlocks a wrongly locked tile first and solves a whole board', () => {
    const puzzle = generatePuzzle('medium', 4)
    let turns = [...puzzle.scramble]
    const wrong = turns.findIndex((_, cell) => !isRight(puzzle, turns, cell))
    let locked = [wrong]
    expect(getHint(puzzle, turns, locked)).toEqual({ kind: 'unlock', cell: wrong })
    locked = []
    for (let i = 0; i < puzzle.solution.length && !isSolved(puzzle, turns); i++) {
      const hint = getHint(puzzle, turns, locked)
      expect(hint.kind).toBe('turn')
      const cell = (hint as { cell: number }).cell
      turns = turns.map((turn, c) => (c === cell ? 0 : turn))
      locked.push(cell)
    }
    expect(isSolved(puzzle, turns)).toBe(true)
    expect(masks(puzzle, turns)).toEqual(puzzle.solution)
  })
})
