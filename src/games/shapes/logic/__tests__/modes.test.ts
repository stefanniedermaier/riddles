import { describe, expect, it } from 'vitest'

import { listMoves } from '../board'
import { getLevel } from '../levels'
import {
  TIME_LIMIT_MS,
  completeLevel,
  createRun,
  parseRun,
  playMove,
  type ShapesRun,
} from '../modes'

function playFirstMove(run: ShapesRun) {
  const move = listMoves(run.board)[0]!
  return playMove(run, move.a, move.b)
}

/** Plays the move with the highest score (a reasonably good player). */
function playBestMove(run: ShapesRun) {
  const outcomes = listMoves(run.board).map((move) => playMove(run, move.a, move.b))
  return outcomes.reduce((best, o) => (o.run.score > best.run.score ? o : best))
}

describe('runs', () => {
  it('creates runs per mode', () => {
    const zen = createRun('zen', 1)
    expect(zen.kinds).toBe(6)
    expect(zen.time).toBeUndefined()
    expect(zen.level).toBeUndefined()

    const time = createRun('time', 1)
    expect(time.time).toEqual({ limitMs: TIME_LIMIT_MS, elapsedMs: 0 })

    const level = createRun('levels', 1, 3)
    const def = getLevel(3)
    expect(level.kinds).toBe(def.kinds)
    expect(level.level).toEqual({
      n: 3,
      movesLeft: def.moves,
      progress: { collected: [0, 0, 0, 0, 0, 0], specials: 0 },
    })
  })

  it('starts a level with the same board regardless of the seed', () => {
    expect(createRun('levels', 1, 7).board).toEqual(createRun('levels', 999, 7).board)
  })

  it('applies a move: score, rng state, ids, counters', () => {
    const run = createRun('zen', 5)
    const outcome = playFirstMove(run)
    expect(outcome.result.valid).toBe(true)
    expect(outcome.run.score).toBe(outcome.result.summary.score)
    expect(outcome.run.movesMade).toBe(1)
    expect(outcome.run.nextId).toBeGreaterThan(run.nextId)
    expect(outcome.run.board).toBe(outcome.result.board)
    expect(run.movesMade).toBe(0) // input untouched
  })

  it('returns the unchanged run for invalid moves', () => {
    const run = createRun('zen', 5)
    // Find two adjacent cells that do not form a move.
    const valid = new Set(listMoves(run.board).map((m) => `${m.a}-${m.b}`))
    let a = 0
    while (valid.has(`${a}-${a + 1}`) || a % 8 === 7) a++
    const outcome = playMove(run, a, a + 1)
    expect(outcome.result.valid).toBe(false)
    expect(outcome.run).toBe(run)
  })

  it('tracks level progress and completes a level', () => {
    let run = createRun('levels', 1, 1)
    const def = getLevel(1)
    let state = 'playing'
    let moves = 0
    while (state === 'playing') {
      const outcome = playBestMove(run)
      run = outcome.run
      state = outcome.levelState
      moves++
    }
    // Level 1 is easy: a greedy player wins it.
    expect(state).toBe('won')
    expect(run.score).toBeGreaterThanOrEqual(def.targetScore)
    expect(run.level!.movesLeft).toBe(def.moves - moves)
    expect(run.level!.progress.collected.reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
    const done = completeLevel(run)
    expect(done.finalScore).toBe(run.score + run.level!.movesLeft * def.moveBonus)
    expect(done.stars).toBeGreaterThanOrEqual(1)
  })

  it('loses a level when the moves run out', () => {
    const run = createRun('levels', 1, 1)
    const lastMove = { ...run, level: { ...run.level!, movesLeft: 1 } }
    const outcome = playFirstMove(lastMove)
    expect(outcome.levelState).toBe('lost')
    expect(outcome.run.level!.movesLeft).toBe(0)
  })

  it('adds time bonuses in time mode', () => {
    let run = createRun('time', 3)
    let bonus = 0
    for (let i = 0; i < 15; i++) {
      const outcome = playFirstMove(run)
      bonus += outcome.timeBonusMs
      run = outcome.run
    }
    expect(run.time!.limitMs).toBe(TIME_LIMIT_MS + bonus)
  })

  it('validates saved runs', () => {
    const run = createRun('levels', 1, 2)
    const roundTrip = JSON.parse(JSON.stringify(run)) as unknown
    expect(parseRun(roundTrip, 'levels')).toEqual(run)
    expect(parseRun(roundTrip, 'zen')).toBeUndefined()
    expect(parseRun({ ...run, board: run.board.slice(1) }, 'levels')).toBeUndefined()
    expect(parseRun(null, 'zen')).toBeUndefined()
    const time = createRun('time', 1)
    expect(parseRun({ ...time, time: undefined }, 'time')).toBeUndefined()
  })
})
