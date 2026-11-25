import { describe, expect, it } from 'vitest'

import { faceDown, isUp } from '@/core/cards/cards'
import { replay } from '@/core/cards/game'
import { solve } from '@/core/cards/solver'
import { handle } from '../handler'
import { DECK, apply, autoFinish, deal, isWon, recyclesLeft, rules, tapMove, type State } from '../rules'

/** Card id of rank (1–13) and suit (0 ♠, 1 ♥, 2 ♦, 3 ♣). */
const c = (rank: number, suit: number) => suit * 13 + rank - 1

function empty(variant: State['variant'] = 'draw1'): State {
  return { variant, t: [[], [], [], [], [], [], []], f: [[], [], [], []], s: [], w: [], recycles: 0 }
}

describe('solitaire rules', () => {
  it('deals 28 cards to the columns and 24 to the stock', () => {
    const state = deal('draw1', 5)
    expect(state.t.map((p) => p.length)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(state.t.every((p) => p.slice(0, -1).every((s) => !isUp(s)) && isUp(p[p.length - 1]!))).toBe(true)
    expect(state.s).toHaveLength(24)
    expect(deal('draw1', 5)).toEqual(state)
    expect(DECK).toHaveLength(52)
  })

  it('draws one or three cards and limits the passes', () => {
    let state = deal('draw3-3pass', 1)
    state = apply(state, { k: 'draw' })!.state
    expect(state.w).toHaveLength(3)
    expect(state.s).toHaveLength(21)
    while (state.s.length) state = apply(state, { k: 'draw' })!.state
    // First turn-over is free, the next ones cost 20 points; after two there is none left.
    const first = apply(state, { k: 'recycle' })!
    expect(first.points).toBe(0)
    state = first.state
    while (state.s.length) state = apply(state, { k: 'draw' })!.state
    expect(apply(state, { k: 'recycle' })!.points).toBe(-20)
    state = apply(state, { k: 'recycle' })!.state
    while (state.s.length) state = apply(state, { k: 'draw' })!.state
    expect(recyclesLeft(state)).toBe(0)
    expect(apply(state, { k: 'recycle' })).toBeNull()
    expect(apply(deal('draw1-1pass', 1), { k: 'recycle' })).toBeNull()
  })

  it('builds down in alternating colours, kings to empty columns, foundations by suit', () => {
    const state = empty()
    state.t[0] = [faceDown(c(2, 0)), c(9, 0)] // 9♠ on a face-down 2♠
    state.t[1] = [c(10, 1)] // 10♥
    state.t[2] = [c(10, 3)] // 10♣
    state.t[3] = [c(13, 2)] // K♦
    state.w = [c(1, 1)] // A♥
    const onRed = apply(state, { k: 'move', from: 't0', n: 1, to: 't1' })!
    expect(onRed.points).toBe(5) // turning up the 2♠
    expect(onRed.state.t[0]).toEqual([c(2, 0)])
    expect(apply(state, { k: 'move', from: 't0', n: 1, to: 't2' })).toBeNull() // black on black
    expect(apply(state, { k: 'move', from: 't1', n: 1, to: 't4' })).toBeNull() // not a king
    expect(apply(state, { k: 'move', from: 't3', n: 1, to: 't4' })).not.toBeNull()
    const ace = apply(state, { k: 'move', from: 'w', n: 1, to: 'f1' })!
    expect(ace.points).toBe(10)
    expect(apply(state, { k: 'move', from: 'w', n: 1, to: 'f0' })).toBeNull() // wrong suit
    expect(apply(ace.state, { k: 'move', from: 'f1', n: 1, to: 't0' })).toBeNull()
  })

  it('taps to the foundation first and finishes a won game automatically', () => {
    const state = empty()
    for (let suit = 0; suit < 4; suit++) state.f[suit] = Array.from({ length: 12 }, (_, i) => c(i + 1, suit))
    state.t[0] = [c(13, 0)]
    state.t[1] = [c(13, 1)]
    state.t[2] = [c(13, 2)]
    state.t[3] = [c(13, 3)]
    expect(tapMove(state, 't0', 0)).toEqual({ k: 'move', from: 't0', n: 1, to: 'f0' })
    const moves = autoFinish(state)!
    expect(moves).toHaveLength(4)
    let current = state
    for (const move of moves) current = apply(current, move)!.state
    expect(isWon(current)).toBe(true)
  })

  it('the solver finds solutions that replay to a win, also with a pass limit', () => {
    for (const variant of ['draw1', 'draw3'] as const) {
      let found = 0
      for (let seed = 1; seed <= 6 && !found; seed++) {
        const result = solve(rules, deal(variant, seed), 60_000)
        if (!result.moves) continue
        found++
        expect(isWon(replay(rules, variant, seed, result.moves)!.state)).toBe(true)
      }
      expect(found).toBe(1)
    }
  })

  it('the worker finds a solvable deal and plans from the middle of a game', () => {
    const { seed } = handle({ kind: 'deal', variant: 'draw1', seed: 3 }) as { seed: number }
    const solution = solve(rules, deal('draw1', seed), 100_000).moves!
    expect(solution).not.toBeNull()
    const { moves } = handle({ kind: 'plan', variant: 'draw1', seed, moves: solution.slice(0, 5) }) as {
      moves: unknown[] | null
    }
    expect(moves).not.toBeNull()
    expect(isWon(replay(rules, 'draw1', seed, [...solution.slice(0, 5), ...(moves as typeof solution)])!.state)).toBe(true)
  }, 30_000)
})
