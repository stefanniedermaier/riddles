import { beforeEach, describe, expect, it } from 'vitest'

import { getVariantStats, recordFinish, recordStart, resetStats } from '../stats'

describe('stats', () => {
  beforeEach(() => resetStats())

  it('counts starts and finishes and tracks best time', () => {
    recordStart('sudoku', 'easy')
    recordStart('sudoku', 'easy')
    const first = recordFinish('sudoku', 'easy', { timeMs: 120_000 })
    expect(first.newBestTime).toBe(false) // nothing to beat yet
    const second = recordFinish('sudoku', 'easy', { timeMs: 90_000 })
    expect(second.newBestTime).toBe(true)
    const third = recordFinish('sudoku', 'easy', { timeMs: 100_000 })
    expect(third.newBestTime).toBe(false)

    const stats = getVariantStats('sudoku', 'easy')
    expect(stats.started).toBe(2)
    expect(stats.finished).toBe(3)
    expect(stats.bestTimeMs).toBe(90_000)
    expect(stats.totalTimeMs).toBe(310_000)
  })

  it('tracks best score', () => {
    recordFinish('shapes', 'zen', { score: 500 })
    expect(recordFinish('shapes', 'zen', { score: 400 }).newBestScore).toBe(false)
    expect(recordFinish('shapes', 'zen', { score: 900 }).newBestScore).toBe(true)
    expect(getVariantStats('shapes', 'zen').bestScore).toBe(900)
  })

  it('resets a single game', () => {
    recordStart('crowns', 'hard')
    recordStart('sudoku', 'hard')
    resetStats('crowns')
    expect(getVariantStats('crowns', 'hard').started).toBe(0)
    expect(getVariantStats('sudoku', 'hard').started).toBe(1)
  })
})
