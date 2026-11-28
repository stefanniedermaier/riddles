import { describe, expect, it } from 'vitest'

import { playOut } from '../bot'
import { fieldColors, floating, newRun, shoot } from '../engine'
import { CELLS } from '../grid'
import { buildLevel, colorsFor, getLevel, goalFor, rowsFor, stonesFor } from '../levels'
import { STONE } from '../types'

describe('levels', () => {
  it('are deterministic and cached', () => {
    expect(buildLevel(7)).toEqual(buildLevel(7))
    expect(getLevel(7)).toBe(getLevel(7))
    expect(buildLevel(8)).not.toEqual(buildLevel(7))
  })

  it('start easy and get harder', () => {
    expect(colorsFor(1)).toBe(3)
    expect(colorsFor(50)).toBe(6)
    expect(rowsFor(1)).toBeLessThan(rowsFor(40))
    expect(stonesFor(1)).toBe(0)
    expect(stonesFor(40)).toBeGreaterThan(0)
    expect(goalFor(1)).toBe('clear')
    expect(new Set([1, 2, 3, 4, 5].map(goalFor))).toEqual(new Set(['clear', 'free', 'color', 'score']))
  })

  it('build a valid field: everything holds, stones apart, the goal fits', () => {
    for (let n = 1; n <= 40; n++) {
      const level = getLevel(n)
      expect(level.cells).toHaveLength(CELLS)
      expect(floating(level.cells, 0)).toEqual([])
      expect(fieldColors(level.cells).length).toBeLessThanOrEqual(level.colors)
      expect(level.shots).toBeGreaterThan(level.par)
      expect(level.goal.type).toBe(goalFor(n))
      const goal = level.goal
      expect(level.marked.length).toBe(goal.type === 'free' ? goal.count : 0)
      expect(level.marked.filter((cell) => level.cells[cell] === STONE)).toEqual([])
      const goalColor = goal.type === 'color' ? goal.color : -1
      expect(goal.type !== 'color' || level.cells.includes(goalColor)).toBe(true)
    }
  })

  it('start a run with the level’s field, goal and shot limit', () => {
    const level = getLevel(3)
    const run = newRun('levels', 123, { level })
    expect(run.cells).toEqual(level.cells)
    expect(run.shotsLeft).toBe(level.shots)
    expect(run.goal).toEqual(level.goal)
    // The seed comes from the level, not from the caller.
    expect(newRun('levels', 999, { level })).toEqual(run)
    expect(shoot(run, 90).run.shotsLeft).toBe(level.shots - 1)
  })
})

describe('tuning', () => {
  it('the bot completes levels 1 … 100 within the shot limit', () => {
    for (let n = 1; n <= 100; n++) {
      const level = getLevel(n)
      const game = playOut(newRun('levels', 0, { level }), level.shots)
      expect(game.run.won, `level ${n}`).toBe(true)
      expect(game.run.shots, `level ${n}`).toBeLessThanOrEqual(level.par)
    }
  }, 60_000)

  it('the bot survives a while in the endless mode', () => {
    const game = playOut(newRun('endless', 21), 120)
    expect(game.run.shots).toBeGreaterThan(40)
    expect(game.run.score).toBeGreaterThan(0)
  }, 60_000)
})
