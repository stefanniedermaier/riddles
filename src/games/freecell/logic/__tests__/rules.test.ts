import { describe, expect, it } from 'vitest'

import { replay } from '@/core/cards/game'
import { solve } from '@/core/cards/solver'
import { apply, autoFinish, capacity, deal, isWon, rules, safeMove, tapMove, type State } from '../rules'

const c = (rank: number, suit: number) => suit * 13 + rank - 1

function empty(cells = 4): State {
  return { variant: 'cells4', t: Array.from({ length: 8 }, () => []), c: new Array<number>(cells).fill(-1), f: [[], [], [], []] }
}

describe('freecell rules', () => {
  it('deals all cards open into 7,7,7,7,6,6,6,6 and the variant sets the free cells', () => {
    const state = deal('cells4', 2)
    expect(state.t.map((p) => p.length)).toEqual([7, 7, 7, 7, 6, 6, 6, 6])
    expect(deal('cells2', 2).c).toEqual([-1, -1])
  })

  it('moves groups only as far as free cells and empty columns allow', () => {
    const state = empty()
    state.t[0] = [c(9, 1), c(8, 0), c(7, 1), c(6, 0)] // 9♥ 8♠ 7♥ 6♠
    state.t[1] = [c(10, 3)] // 10♣
    expect(capacity(state, false)).toBe(5 * 2 ** 6)
    state.c = [c(1, 0), c(1, 1), c(1, 2), -1] // one cell left
    state.t.forEach((pile, i) => i > 1 && pile.length === 0 && state.t[i]!.push(c(13, i % 4)))
    expect(capacity(state, false)).toBe(2)
    expect(apply(state, { from: 't0', n: 4, to: 't1' })).toBeNull()
    state.c = [-1, -1, -1, -1]
    expect(apply(state, { from: 't0', n: 4, to: 't1' })?.points).toBe(-1)
  })

  it('uses free cells, foundations and safe automatic moves', () => {
    const state = empty()
    state.t[0] = [c(5, 1), c(1, 0)]
    const toCell = tapMove({ ...state, t: [[c(5, 1), c(4, 1)], ...state.t.slice(1)] }, 't0', 1)
    expect(toCell?.to).toBe('c0')
    expect(safeMove(state)).toEqual({ from: 't0', n: 1, to: 'f0' })
    expect(apply(state, { from: 't0', n: 1, to: 'f0' })?.points).toBe(9)
  })

  it('finishes ordered columns automatically', () => {
    const state = empty()
    for (let s = 0; s < 4; s++) state.f[s] = Array.from({ length: 11 }, (_, i) => c(i + 1, s))
    state.t[0] = [c(13, 0), c(12, 0)]
    state.t[1] = [c(13, 1), c(12, 1)]
    state.t[2] = [c(13, 2), c(12, 2)]
    state.t[3] = [c(13, 3), c(12, 3)]
    let current = state
    for (const move of autoFinish(state)!) current = apply(current, move)!.state
    expect(isWon(current)).toBe(true)
  })

  it('the solver solves deals that replay to a win', () => {
    const result = solve(rules, deal('cells4', 1), 100_000)
    expect(isWon(replay(rules, 'cells4', 1, result.moves!)!.state)).toBe(true)
  }, 30_000)
})
