import { describe, expect, it } from 'vitest'

import { faceDown, isUp } from '@/core/cards/cards'
import { replay } from '@/core/cards/game'
import { solve } from '@/core/cards/solver'
import { DECKS, apply, deal, isWon, rules, runLength, tapMove, type State } from '../rules'

/** In the one-suit deck, card `rank - 1 + 13 * k` has that rank (all spades). */
const r = (rank: number, copy = 0) => rank - 1 + 13 * copy

function empty(): State {
  return { variant: 'suits1', t: Array.from({ length: 10 }, () => []), s: [], done: [] }
}

describe('spider rules', () => {
  it('deals 54 cards and keeps 50 in the stock', () => {
    const state = deal('suits2', 4)
    expect(state.t.map((p) => p.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5])
    expect(state.t.every((p) => isUp(p[p.length - 1]!))).toBe(true)
    expect(state.s).toHaveLength(50)
    expect(DECKS.suits2.filter((c) => c.suit === 1)).toHaveLength(52)
  })

  it('moves one-suit runs, builds on any suit and removes a complete run', () => {
    const state = empty()
    // King → 2 of spades in column 0, the ace in column 1.
    state.t[0] = [faceDown(r(5, 1)), ...Array.from({ length: 12 }, (_, i) => r(13 - i))]
    state.t[1] = [r(1)]
    state.t[2] = [r(9, 2)]
    expect(runLength(state, 0)).toBe(12)
    const done = apply(state, { k: 'move', from: 't1', n: 1, to: 't0' })!
    expect(done.points).toBe(99) // −1 for the move, +100 for the run
    expect(done.state.done).toHaveLength(1)
    expect(done.state.t[0]).toEqual([r(5, 1)]) // turned up
    expect(apply(state, { k: 'move', from: 't0', n: 13, to: 't2' })).toBeNull()
  })

  it('deals only when no column is empty', () => {
    const state = deal('suits1', 1)
    expect(apply(state, { k: 'deal' })?.state.s).toHaveLength(40)
    expect(apply({ ...state, t: [[], ...state.t.slice(1)] }, { k: 'deal' })).toBeNull()
    expect(tapMove(state, 's', 0)).toEqual({ k: 'deal' })
  })

  it('the solver solves a one-suit deal that replays to a win', () => {
    const result = solve(rules, deal('suits1', 2), 80_000)
    expect(isWon(replay(rules, 'suits1', 2, result.moves!)!.state)).toBe(true)
  }, 30_000)
})
