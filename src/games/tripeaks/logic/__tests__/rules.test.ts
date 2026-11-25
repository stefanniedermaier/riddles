import { describe, expect, it } from 'vitest'

import { replay } from '@/core/cards/game'
import { solve } from '@/core/cards/solver'
import { COVERED_BY, POSITIONS, apply, deal, isFree, isStuck, isWon, rules, winPoints, type State } from '../rules'

const c = (rank: number, suit = 0) => suit * 13 + rank - 1

describe('tripeaks rules', () => {
  it('lays out three peaks: 28 cards, bottom row open', () => {
    expect(POSITIONS).toHaveLength(28)
    expect(COVERED_BY.slice(18).every((list) => list.length === 0)).toBe(true)
    expect(COVERED_BY.slice(0, 18).every((list) => list.length === 2)).toBe(true)
    const state = deal('easy', 1)
    expect(state.s).toHaveLength(23)
    expect(state.w).toHaveLength(1)
    expect(POSITIONS.filter((_, i) => isFree(state, i))).toHaveLength(10)
  })

  it('plays one higher or lower, wraps ace and king on Easy, scores streaks', () => {
    const base = deal('easy', 1)
    const peaks = [...base.peaks]
    peaks[18] = c(1) // A♠ in the open bottom row
    peaks[19] = c(2) // 2♠ next to it
    const state: State = { ...base, peaks, w: [c(13, 1)] } // K♥ on the waste
    const first = apply(state, { k: 'play', i: 18 })!
    expect(first.points).toBe(10)
    expect(apply({ ...state, variant: 'medium' }, { k: 'play', i: 18 })).toBeNull()
    expect(apply(first.state, { k: 'play', i: 19 })!.points).toBe(20) // second in a row
    expect(apply(first.state, { k: 'draw' })!.state.streak).toBe(0)
  })

  it('a cleared peak gives a bonus, the third one more; stuck without stock and moves', () => {
    const base = deal('easy', 1)
    const peaks = [...base.peaks]
    peaks[0] = c(5)
    const all = 2 ** 28 - 1
    const lastPeak: State = { ...base, peaks, w: [c(4)], removed: all & ~1 }
    expect(apply(lastPeak, { k: 'play', i: 0 })!.points).toBe(10 + 1000)
    const firstPeak: State = { ...lastPeak, removed: all & ~0b111 }
    expect(apply(firstPeak, { k: 'play', i: 0 })!.points).toBe(10 + 250)
    expect(isStuck({ ...lastPeak, s: [], w: [c(9)] })).toBe(true)
    expect(winPoints({ ...lastPeak, s: [1, 2] })).toBe(100)
  })

  it('the solver solves an Easy deal that replays to a win', () => {
    const result = solve(rules, deal('easy', 3), 60_000)
    expect(isWon(replay(rules, 'easy', 3, result.moves!)!.state)).toBe(true)
  })
})
