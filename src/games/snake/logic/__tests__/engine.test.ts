import { describe, expect, it } from 'vitest'

import {
  isTurn,
  neighbour,
  newRun,
  obstaclesOf,
  parseRun,
  pointsPerFood,
  START_LENGTH,
  step,
  stepInterval,
  type SnakeRun,
} from '../engine'
import { MAZE_COUNT, MAZE_SIZE, mazeCells, mazeRows } from '../mazes'
import { DIRECTIONS, type Direction } from '../types'

/** A run on a small board with a given body and food (for exact scenarios). */
function runWith(overrides: Partial<SnakeRun>): SnakeRun {
  return { ...newRun('classic', 'normal', 1), ...overrides }
}

describe('newRun', () => {
  it('starts in the middle, heading right, with food on a free cell', () => {
    const run = newRun('classic', 'normal', 42)
    expect(run.size).toBe(15)
    expect(run.body).toEqual([7 * 15 + 7, 7 * 15 + 6, 7 * 15 + 5])
    expect(run.direction).toBe('right')
    expect(run.body).not.toContain(run.food)
    expect(run.food).toBeGreaterThanOrEqual(0)
  })

  it('is the same for the same seed', () => {
    expect(newRun('maze', 'fast', 7)).toEqual(newRun('maze', 'fast', 7))
  })

  it('picks a maze layout in the maze mode only, never with food on a stone', () => {
    for (let seed = 0; seed < 30; seed++) {
      const run = newRun('maze', 'normal', seed)
      expect(run.layout).toBeGreaterThanOrEqual(0)
      expect(run.layout).toBeLessThan(MAZE_COUNT)
      expect(obstaclesOf(run)).not.toContain(run.food)
    }
    expect(newRun('open', 'normal', 1).layout).toBe(-1)
  })
})

describe('step', () => {
  it('moves the head and the tail one cell', () => {
    const run = runWith({ food: 0 })
    const { run: next, ate, died, leftTail } = step(run)
    expect(ate).toBe(false)
    expect(died).toBe(false)
    expect(next.body).toEqual([run.body[0]! + 1, run.body[0]!, run.body[1]!])
    expect(leftTail).toBe(run.body[2])
    expect(next.steps).toBe(1)
  })

  it('turns by 90° and ignores a turn back into the snake', () => {
    const run = runWith({ food: 0 })
    expect(step(run, 'up').run.body[0]).toBe(run.body[0]! - 15)
    expect(step(run, 'left').run.body[0]).toBe(run.body[0]! + 1)
    expect(step(run, 'left').run.direction).toBe('right')
  })

  it('grows when it eats: the tail stays one step, score and food are new', () => {
    const run = runWith({ food: 7 * 15 + 8 })
    const { run: next, ate, leftTail } = step(run)
    expect(ate).toBe(true)
    expect(leftTail).toBeNull()
    expect(next.body).toHaveLength(START_LENGTH + 1)
    expect(next.body.at(-1)).toBe(run.body.at(-1))
    expect(next.score).toBe(pointsPerFood('normal'))
    expect(next.eaten).toBe(1)
    expect(next.body).not.toContain(next.food)
    expect(next.rngState).not.toBe(run.rngState)
  })

  it('dies at the wall in the classic mode', () => {
    const run = runWith({ body: [14, 13, 12], food: 100 })
    const { run: next, died } = step(run)
    expect(died).toBe(true)
    expect(next.over).toBe(true)
    expect(next.body).toEqual(run.body)
    expect(step(next).run).toBe(next)
  })

  it('wraps around in the open mode', () => {
    const run = { ...newRun('open', 'normal', 1), body: [14, 13, 12], food: 100 }
    expect(step(run).run.body[0]).toBe(0)
    expect(step(run, 'up').run.body[0]).toBe(14 * 15 + 14)
  })

  it('dies when it bites itself', () => {
    // A loop: head at 16, moving up into 1 which is part of the body.
    const run = runWith({ body: [16, 17, 2, 1, 0], direction: 'left', food: 200 })
    const { died } = step(run, 'up')
    expect(died).toBe(true)
  })

  it('may move into the cell the tail is just leaving', () => {
    // Square of four: head 16 → up to 1 (the tail, which moves on in the same step).
    const ring = runWith({ body: [16, 17, 2, 1], direction: 'left', food: 200 })
    expect(step(ring, 'up').died).toBe(false)
  })

  it('dies on a stone in the maze mode', () => {
    const run = newRun('maze', 'normal', 1)
    const stone = obstaclesOf(run)[0]!
    const left = stone - 1
    const placed = { ...run, body: [left, left - 1, left - 2], direction: 'right' as Direction, food: -1 }
    expect(step(placed).died).toBe(true)
  })

  it('ends as won when the snake fills the board', () => {
    // The board as one zigzag path; the snake takes all of it but the first cell (the food),
    // its head next to it.
    const size = 15
    const path: number[] = []
    for (let row = 0; row < size; row++) {
      for (let i = 0; i < size; i++) path.push(row * size + (row % 2 === 0 ? i : size - 1 - i))
    }
    const run = runWith({ body: path.slice(1), direction: 'left', food: path[0]! })
    const { run: next, ate } = step(run)
    expect(ate).toBe(true)
    expect(next.body).toHaveLength(size * size)
    expect(next.won).toBe(true)
    expect(next.over).toBe(true)
    expect(next.food).toBe(-1)
  })

  it('is deterministic: the same inputs give the same run', () => {
    const play = () => {
      let run = newRun('open', 'fast', 99)
      const turns: (Direction | undefined)[] = ['up', undefined, 'left', undefined, 'down', 'right']
      for (let i = 0; i < 60; i++) run = step(run, turns[i % turns.length]).run
      return run
    }
    expect(play()).toEqual(play())
  })
})

describe('rules helpers', () => {
  it('neighbour stays on the board unless it wraps', () => {
    expect(neighbour(0, 'up', 15, false)).toBe(-1)
    expect(neighbour(0, 'left', 15, true)).toBe(14)
    expect(neighbour(14, 'right', 15, false)).toBe(-1)
  })

  it('isTurn rejects the same and the opposite direction', () => {
    expect(isTurn('up', 'up')).toBe(false)
    expect(isTurn('up', 'down')).toBe(false)
    expect(isTurn('up', 'left')).toBe(true)
  })

  it('speeds up per food down to a minimum; calm has no interval', () => {
    expect(stepInterval({ speed: 'normal', eaten: 0 })).toBe(180)
    expect(stepInterval({ speed: 'normal', eaten: 5 })).toBe(160)
    expect(stepInterval({ speed: 'normal', eaten: 500 })).toBe(110)
    expect(stepInterval({ speed: 'slow', eaten: 0 })).toBeGreaterThan(stepInterval({ speed: 'fast', eaten: 0 }))
    expect(stepInterval({ speed: 'calm', eaten: 3 })).toBe(0)
  })

  it('faster speeds give more points', () => {
    expect(pointsPerFood('fast')).toBeGreaterThan(pointsPerFood('normal'))
    expect(pointsPerFood('normal')).toBeGreaterThan(pointsPerFood('slow'))
  })
})

describe('parseRun', () => {
  it('accepts a run after some steps', () => {
    let run = newRun('maze', 'slow', 3)
    for (let i = 0; i < 3; i++) run = step(run).run
    expect(parseRun(JSON.parse(JSON.stringify(run)), 'maze')).toEqual(run)
  })

  it('accepts a body across the border in the open mode only', () => {
    const open = { ...newRun('open', 'normal', 1), body: [0, 14, 13], food: 100 }
    expect(parseRun(open, 'open')).toBeDefined()
    expect(parseRun({ ...open, variant: 'classic', layout: -1 }, 'classic')).toBeUndefined()
  })

  it('rejects broken data', () => {
    const run = newRun('classic', 'normal', 1)
    expect(parseRun(null, 'classic')).toBeUndefined()
    expect(parseRun(run, 'open')).toBeUndefined()
    expect(parseRun({ ...run, speed: 'warp' }, 'classic')).toBeUndefined()
    expect(parseRun({ ...run, body: [0, 2, 4] }, 'classic')).toBeUndefined()
    expect(parseRun({ ...run, body: [0, 1, 1] }, 'classic')).toBeUndefined()
    expect(parseRun({ ...run, food: run.body[0] }, 'classic')).toBeUndefined()
    expect(parseRun({ ...run, over: true }, 'classic')).toBeUndefined()
    expect(parseRun({ ...run, direction: 'north' }, 'classic')).toBeUndefined()
    expect(parseRun({ ...run, layout: 0 }, 'classic')).toBeUndefined()
  })
})

describe('maze layouts', () => {
  const start = Math.floor(MAZE_SIZE / 2)

  it.each(Array.from({ length: MAZE_COUNT }, (_, i) => i))('layout %i is square and symmetric', (layout) => {
    const rows = mazeRows(layout)
    expect(rows).toHaveLength(MAZE_SIZE)
    for (const row of rows) expect(row).toHaveLength(MAZE_SIZE)
    for (let r = 0; r < MAZE_SIZE; r++) {
      expect(rows[r]).toBe([...rows[r]!].reverse().join(''))
      expect(rows[r]).toBe(rows[MAZE_SIZE - 1 - r])
    }
  })

  it.each(Array.from({ length: MAZE_COUNT }, (_, i) => i))(
    'layout %i keeps the start row free and all free cells connected',
    (layout) => {
      const stones = new Set(mazeCells(layout))
      for (let col = 0; col < MAZE_SIZE; col++) expect(stones.has(start * MAZE_SIZE + col)).toBe(false)
      const seen = new Set<number>([start * MAZE_SIZE + start])
      const queue = [...seen]
      while (queue.length > 0) {
        const cell = queue.pop()!
        for (const direction of DIRECTIONS) {
          const next = neighbour(cell, direction, MAZE_SIZE, false)
          if (next >= 0 && !stones.has(next) && !seen.has(next)) {
            seen.add(next)
            queue.push(next)
          }
        }
      }
      expect(seen.size).toBe(MAZE_SIZE * MAZE_SIZE - stones.size)
    },
  )
})
