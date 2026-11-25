/**
 * Spider rules as a pure state machine (two decks, ten columns).
 *
 * Piles: `t0`–`t9` tableau, `s` stock. Completed runs king → ace of one suit leave the table.
 */
import { faceDown, idOf, isUp, makeDeck, shuffledIds, type CardDef, type Slot, type Suit } from '@/core/cards/cards'
import type { Applied, CardRules } from '@/core/cards/game'
import { createRng, hashSeed } from '@/core/rng'

import { VARIANTS, type Variant } from './variants'

export { VARIANTS, type Variant }


const SUITS: Record<Variant, Suit[]> = { suits1: [0], suits2: [0, 1], suits4: [0, 1, 2, 3] }

export const DECKS: Record<Variant, CardDef[]> = {
  suits1: makeDeck(2, SUITS.suits1),
  suits2: makeDeck(2, SUITS.suits2),
  suits4: makeDeck(2, SUITS.suits4),
}

export interface State {
  variant: Variant
  t: Slot[][]
  /** Stock (face down, dealt from the end). */
  s: number[]
  /** Kings of the completed runs, in order. */
  done: number[]
}

export type Move = { k: 'deal' } | { k: 'move'; from: string; n: number; to: string }

export const START_POINTS = 500

export function deal(variant: Variant, seed: number): State {
  const ids = shuffledIds(104, createRng(hashSeed('spider', variant, seed)))
  const t: Slot[][] = []
  let next = 0
  for (let col = 0; col < 10; col++) {
    const count = col < 4 ? 6 : 5
    const pile: Slot[] = []
    for (let i = 0; i < count; i++) {
      const id = ids[next++]!
      pile.push(i === count - 1 ? id : faceDown(id))
    }
    t.push(pile)
  }
  return { variant, t, s: ids.slice(next), done: [] }
}

const index = (pile: string) => Number(pile.slice(1))

/** Length of the movable run (one suit, descending) at the bottom of a column. */
export function runLength(state: State, column: number): number {
  const deck = DECKS[state.variant]
  const pile = state.t[column]!
  if (!pile.length || !isUp(pile[pile.length - 1]!)) return 0
  let n = 1
  while (n < pile.length) {
    const upper = pile[pile.length - n - 1]!
    if (!isUp(upper)) break
    const a = deck[upper]!
    const b = deck[pile[pile.length - n]!]!
    if (a.suit !== b.suit || a.rank !== b.rank + 1) break
    n++
  }
  return n
}

/** Turns up the top card and removes a completed run; returns the number of runs removed. */
function settle(state: State, column: number): number {
  const deck = DECKS[state.variant]
  const pile = [...state.t[column]!]
  let removed = 0
  if (pile.length >= 13) {
    const tail = pile.slice(-13)
    const king = tail[0]!
    if (
      tail.every(isUp) &&
      deck[king]!.rank === 13 &&
      tail.every((id, i) => deck[id]!.suit === deck[king]!.suit && deck[id]!.rank === 13 - i)
    ) {
      pile.length -= 13
      state.done = [...state.done, king]
      removed = 1
    }
  }
  const top = pile[pile.length - 1]
  if (top !== undefined && !isUp(top)) pile[pile.length - 1] = idOf(top)
  state.t[column] = pile
  return removed
}

export function apply(state: State, move: Move): Applied<State> | null {
  if (move.k === 'deal') {
    if (!state.s.length || state.t.some((pile) => pile.length === 0)) return null
    const next: State = { ...state, t: [...state.t], s: [...state.s] }
    let runs = 0
    for (let col = 0; col < 10 && next.s.length; col++) next.t[col] = [...next.t[col]!, next.s.pop()!]
    for (let col = 0; col < 10; col++) runs += settle(next, col)
    return { state: next, points: -1 + 100 * runs }
  }
  const { from, to, n } = move
  if (from === to || from[0] !== 't' || to[0] !== 't') return null
  const source = state.t[index(from)]
  const target = state.t[index(to)]
  if (!source || !target || n < 1 || n > runLength(state, index(from))) return null
  const deck = DECKS[state.variant]
  const first = deck[source[source.length - n]!]!
  if (target.length) {
    const top = target[target.length - 1]!
    if (!isUp(top) || deck[top]!.rank !== first.rank + 1) return null
  }
  const next: State = { ...state, t: [...state.t] }
  next.t[index(from)] = source.slice(0, -n)
  next.t[index(to)] = [...target, ...source.slice(-n)]
  settle(next, index(from))
  const runs = settle(next, index(to))
  return { state: next, points: -1 + 100 * runs }
}

export const isWon = (state: State): boolean => state.done.length === 8

function solverMoves(state: State): Move[] {
  const deck = DECKS[state.variant]
  const sameSuit: Move[] = []
  const uncover: Move[] = []
  const other: Move[] = []
  const toEmpty: Move[] = []
  const firstEmpty = state.t.findIndex((pile) => pile.length === 0)
  state.t.forEach((pile, i) => {
    const run = runLength(state, i)
    for (let n = 1; n <= run; n++) {
      const first = deck[pile[pile.length - n]!]!
      const below = pile[pile.length - n - 1]
      const sitsOn = below !== undefined && isUp(below) ? deck[below]! : null
      // Already resting on its natural successor of the same suit: never move it apart.
      if (sitsOn && sitsOn.rank === first.rank + 1 && sitsOn.suit === first.suit) continue
      for (let j = 0; j < 10; j++) {
        const target = state.t[j]!
        if (j === i || !target.length) continue
        const top = deck[target[target.length - 1]!]!
        if (top.rank !== first.rank + 1) continue
        const move: Move = { k: 'move', from: `t${i}`, n, to: `t${j}` }
        if (top.suit === first.suit) sameSuit.push(move)
        else if (sitsOn && sitsOn.rank === first.rank + 1) continue // sideways move, no gain
        else if (n === pile.length || (below !== undefined && !isUp(below))) uncover.push(move)
        else other.push(move)
      }
      if (firstEmpty >= 0 && n < pile.length && n === run) {
        toEmpty.push({ k: 'move', from: `t${i}`, n, to: `t${firstEmpty}` })
      }
    }
  })
  const dealMove: Move[] = state.s.length && firstEmpty < 0 ? [{ k: 'deal' }] : []
  return [...sameSuit, ...uncover, ...other, ...toEmpty, ...dealMove]
}

function key(state: State): string {
  return `${state.t
    .map((pile) => pile.join(','))
    .sort()
    .join('|')}#${state.s.length}#${state.done.length}`
}

function isMove(value: unknown): value is Move {
  if (typeof value !== 'object' || value === null) return false
  const m = value as { k?: unknown; from?: unknown; to?: unknown; n?: unknown }
  if (m.k === 'deal') return true
  return (
    m.k === 'move' &&
    typeof m.from === 'string' &&
    typeof m.to === 'string' &&
    /^t[0-9]$/.test(m.from) &&
    /^t[0-9]$/.test(m.to) &&
    Number.isInteger(m.n) &&
    (m.n as number) >= 1 &&
    (m.n as number) <= 13
  )
}

export const rules: CardRules<State, Move, Variant> = { variants: VARIANTS, deal, apply, isWon, solverMoves, key, isMove }

// --- Helpers for the play view -----------------------------------------------------------

export function canPick(state: State, pile: string, at: number): boolean {
  if (pile[0] !== 't') return false
  const column = state.t[index(pile)]
  if (!column) return false
  const n = column.length - at
  return n >= 1 && n <= runLength(state, index(pile))
}

export function dropMove(state: State, from: string, at: number, to: string): Move | null {
  const move: Move = { k: 'move', from, n: (state.t[index(from)]?.length ?? 0) - at, to }
  return apply(state, move) ? move : null
}

/** Deal from the stock, or move the tapped run to the best column. */
export function tapMove(state: State, pile: string, at: number): Move | null {
  if (pile === 's') return apply(state, { k: 'deal' }) ? { k: 'deal' } : null
  if (!canPick(state, pile, at)) return null
  const deck = DECKS[state.variant]
  const n = state.t[index(pile)]!.length - at
  const first = deck[state.t[index(pile)]![at]!]!
  let best: Move | null = null
  let bestScore = -Infinity
  for (let j = 0; j < 10; j++) {
    const to = `t${j}`
    const move: Move = { k: 'move', from: pile, n, to }
    if (to === pile || !apply(state, move)) continue
    const target = state.t[j]!
    const top = target.length ? deck[target[target.length - 1]!]! : null
    // Same suit first, then any non-empty column, empty columns last.
    const score = top ? (top.suit === first.suit ? 3 : 1) : at === 0 ? -9 : -1
    if (score - j / 100 > bestScore) {
      bestScore = score - j / 100
      best = move
    }
  }
  return best
}
