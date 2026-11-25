import { describe, expect, it } from 'vitest'

import { createRng } from '@/core/rng'
import { faceDown, faceUp, idOf, isRed, isUp, makeDeck, shuffledIds } from '../cards'
import { HINT_COST, UNDO_COST, replay, scoreOf, timeBonus, type CardRules } from '../game'
import { solve } from '../solver'

describe('card engine', () => {
  it('builds decks and encodes face-down cards', () => {
    const deck = makeDeck(1)
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map((c) => `${c.suit}-${c.rank}`)).size).toBe(52)
    expect(makeDeck(2, [0]).every((c) => c.suit === 0)).toBe(true)
    expect(makeDeck(2, [0, 1]).filter((c) => c.suit === 1)).toHaveLength(52)
    expect(isUp(faceDown(7))).toBe(false)
    expect(idOf(faceDown(7))).toBe(7)
    expect(faceUp(faceDown(0))).toBe(0)
    expect(isRed(1) && isRed(2) && !isRed(0) && !isRed(3)).toBe(true)
    const ids = shuffledIds(52, createRng(1))
    expect([...ids].sort((a, b) => a - b)).toEqual([...Array(52).keys()])
    expect(shuffledIds(52, createRng(1))).toEqual(ids)
  })

  it('scores never go below 0 and undo/hints cost points', () => {
    expect(scoreOf(30, 1, 1)).toBe(30 - UNDO_COST - HINT_COST)
    expect(scoreOf(5, 10, 10)).toBe(0)
    expect(timeBonus(60_000)).toBe(840)
    expect(timeBonus(2_000_000)).toBe(0)
  })

  // A toy game: count from 0 to 5 with steps of 1 or 2, 4 is forbidden.
  const toy: CardRules<number, number, 'v'> = {
    variants: ['v'],
    deal: () => 0,
    apply: (state, move) => (state + move === 4 || state + move > 5 ? null : { state: state + move, points: move }),
    isWon: (state) => state === 5,
    solverMoves: () => [2, 1],
    key: (state) => String(state),
    isMove: (value): value is number => value === 1 || value === 2,
  }

  it('solves and replays a game', () => {
    const result = solve(toy, 0)
    expect(result.moves).not.toBeNull()
    expect(replay(toy, 'v', 0, result.moves!)?.state).toBe(5)
    expect(replay(toy, 'v', 0, [2, 2])).toBeNull() // 4 is forbidden
    expect(solve({ ...toy, isWon: (s) => s === 6 }, 0)).toEqual({ moves: null, exhausted: false })
  })
})
