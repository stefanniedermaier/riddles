import { beforeEach, describe, expect, it } from 'vitest'

import {
  dayKey,
  getActivity,
  getVariantStats,
  recordFinish,
  recordStart,
  resetStats,
  summarizeActivity,
} from '../stats'

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

describe('activity and averages', () => {
  beforeEach(() => resetStats())

  it('summarises active days and day streaks', () => {
    expect(summarizeActivity([], '2026-11-23')).toEqual({ activeDays: 0, currentStreak: 0, bestStreak: 0 })
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-10', '2026-11-22', '2026-11-23']
    expect(summarizeActivity(days, '2026-11-23')).toEqual({ activeDays: 6, currentStreak: 2, bestStreak: 3 })
    // Nothing played today yet: a streak up to yesterday still counts …
    expect(summarizeActivity(days, '2026-11-24').currentStreak).toBe(2)
    // … but not after a gap.
    expect(summarizeActivity(days, '2026-11-26').currentStreak).toBe(0)
    // Month boundaries and duplicates.
    expect(summarizeActivity(['2026-10-31', '2026-11-01', '2026-11-01'], '2026-11-01')).toEqual({
      activeDays: 2,
      currentStreak: 2,
      bestStreak: 2,
    })
  })

  it('marks today as active when playing', () => {
    recordStart('crowns', 'easy')
    expect(getActivity()).toEqual({ activeDays: 1, currentStreak: 1, bestStreak: 1 })
    expect(dayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('sums scores for the average', () => {
    recordFinish('merge', 'classic', { score: 100 })
    recordFinish('merge', 'classic', { score: 300 })
    const stats = getVariantStats('merge', 'classic')
    expect(stats.totalScore).toBe(400)
    expect(stats.scoredRuns).toBe(2)
  })
})
