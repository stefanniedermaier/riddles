/**
 * FreeCell rules as a pure state machine.
 *
 * Piles: `t0`–`t7` tableau, `c0`–`c3` free cells (as many as the variant has), `f0`–`f3`
 * foundations (one per suit). Every card is face up.
 */
import { isRed, makeDeck, shuffledIds, type CardDef } from '@/core/cards/cards'
import type { Applied, CardRules } from '@/core/cards/game'
import { createRng, hashSeed } from '@/core/rng'

import { VARIANTS, type Variant } from './variants'

export { VARIANTS, type Variant }


const CELLS: Record<Variant, number> = { cells4: 4, cells3: 3, cells2: 2 }

export const DECK: CardDef[] = makeDeck(1)

export interface State {
  variant: Variant
  t: number[][]
  /** Free cells: a card id or -1. */
  c: number[]
  f: number[][]
}

export interface Move {
  from: string
  n: number
  to: string
}

export function deal(variant: Variant, seed: number): State {
  const ids = shuffledIds(52, createRng(hashSeed('freecell', seed)))
  const t: number[][] = Array.from({ length: 8 }, () => [])
  ids.forEach((id, i) => t[i % 8]!.push(id))
  return { variant, t, c: new Array<number>(CELLS[variant]).fill(-1), f: [[], [], [], []] }
}

const index = (pile: string) => Number(pile.slice(1))

/** Cards a group move may carry: (free cells + 1) × 2^(empty columns). */
export function capacity(state: State, toEmptyColumn: boolean): number {
  const cells = state.c.filter((card) => card < 0).length
  const empty = state.t.filter((pile) => pile.length === 0).length - (toEmptyColumn ? 1 : 0)
  return (cells + 1) * 2 ** Math.max(0, empty)
}

/** The top `n` cards of `from` if they form a movable run (alternating colours, descending). */
function takeable(state: State, from: string, n: number): number[] | null {
  if (n < 1) return null
  if (from[0] === 'c') {
    const card = state.c[index(from)]
    return n === 1 && card !== undefined && card >= 0 ? [card] : null
  }
  if (from[0] !== 't') return null
  const pile = state.t[index(from)]
  if (!pile || n > pile.length) return null
  const run = pile.slice(pile.length - n)
  for (let i = 1; i < run.length; i++) {
    const a = DECK[run[i - 1]!]!
    const b = DECK[run[i]!]!
    if (a.rank !== b.rank + 1 || isRed(a.suit) === isRed(b.suit)) return null
  }
  return run
}

function fits(state: State, cards: number[], to: string): boolean {
  const first = DECK[cards[0]!]!
  if (to[0] === 'f') {
    const pile = state.f[index(to)]
    return !!pile && cards.length === 1 && first.suit === index(to) && first.rank === pile.length + 1
  }
  if (to[0] === 'c') {
    const card = state.c[index(to)]
    return cards.length === 1 && card !== undefined && card < 0
  }
  if (to[0] === 't') {
    const pile = state.t[index(to)]
    if (!pile) return false
    if (cards.length > capacity(state, pile.length === 0)) return false
    if (pile.length === 0) return true
    const top = DECK[pile[pile.length - 1]!]!
    return top.rank === first.rank + 1 && isRed(top.suit) !== isRed(first.suit)
  }
  return false
}

export function apply(state: State, move: Move): Applied<State> | null {
  const { from, to, n } = move
  if (from === to) return null
  const cards = takeable(state, from, n)
  if (!cards || !fits(state, cards, to)) return null
  const next: State = { ...state, t: [...state.t], c: [...state.c], f: [...state.f] }
  if (from[0] === 'c') next.c[index(from)] = -1
  else next.t[index(from)] = state.t[index(from)]!.slice(0, -n)
  if (to[0] === 'c') next.c[index(to)] = cards[0]!
  else if (to[0] === 'f') next.f[index(to)] = [...state.f[index(to)]!, cards[0]!]
  else next.t[index(to)] = [...next.t[index(to)]!, ...cards]
  return { state: next, points: (to[0] === 'f' ? 10 : 0) - 1 }
}

export const isWon = (state: State): boolean => state.f.every((pile) => pile.length === 13)

function isSafe(state: State, id: number): boolean {
  const { suit, rank } = DECK[id]!
  if (rank <= 2) return true
  const opposite = isRed(suit) ? [0, 3] : [1, 2]
  return opposite.every((s) => state.f[s]!.length >= rank - 1)
}

/** Single cards that could move: free cells and column tops. */
function sources(state: State): { pile: string; id: number }[] {
  const list: { pile: string; id: number }[] = []
  state.c.forEach((id, i) => id >= 0 && list.push({ pile: `c${i}`, id }))
  state.t.forEach((pile, i) => pile.length && list.push({ pile: `t${i}`, id: pile[pile.length - 1]! }))
  return list
}

/** The next safe move to a foundation, if any (used for automatic moves). */
export function safeMove(state: State): Move | null {
  for (const { pile, id } of sources(state)) {
    const to = `f${DECK[id]!.suit}`
    if (fits(state, [id], to) && isSafe(state, id)) return { from: pile, n: 1, to }
  }
  return null
}

/** Longest movable run at the bottom of a column. */
function runLength(state: State, column: number): number {
  const pile = state.t[column]!
  let n = pile.length ? 1 : 0
  while (n < pile.length && takeable(state, `t${column}`, n + 1)) n++
  return n
}

function solverMoves(state: State): Move[] {
  const safe = safeMove(state)
  if (safe) return [safe]
  const foundation: Move[] = []
  const build: Move[] = []
  const toEmpty: Move[] = []
  const toCell: Move[] = []
  for (const { pile, id } of sources(state)) {
    const to = `f${DECK[id]!.suit}`
    if (fits(state, [id], to)) foundation.push({ from: pile, n: 1, to })
  }
  const firstEmpty = state.t.findIndex((pile) => pile.length === 0)
  const firstCell = state.c.findIndex((card) => card < 0)
  // From free cells.
  state.c.forEach((id, i) => {
    if (id < 0) return
    for (let j = 0; j < 8; j++) {
      if (state.t[j]!.length && fits(state, [id], `t${j}`)) build.push({ from: `c${i}`, n: 1, to: `t${j}` })
    }
    if (firstEmpty >= 0) toEmpty.push({ from: `c${i}`, n: 1, to: `t${firstEmpty}` })
  })
  // From columns.
  state.t.forEach((pile, i) => {
    if (!pile.length) return
    const run = runLength(state, i)
    for (let j = 0; j < 8; j++) {
      if (j === i || !state.t[j]!.length) continue
      const top = DECK[state.t[j]![state.t[j]!.length - 1]!]!
      // The only run length that can land on this top card.
      for (let n = 1; n <= run; n++) {
        const first = DECK[pile[pile.length - n]!]!
        if (first.rank + 1 === top.rank) {
          if (fits(state, pile.slice(pile.length - n), `t${j}`)) build.push({ from: `t${i}`, n, to: `t${j}` })
          break
        }
      }
    }
    if (firstEmpty >= 0 && run < pile.length) {
      const n = Math.min(run, capacity(state, true))
      toEmpty.push({ from: `t${i}`, n, to: `t${firstEmpty}` })
      if (n > 1) toEmpty.push({ from: `t${i}`, n: 1, to: `t${firstEmpty}` })
    }
    if (firstCell >= 0) toCell.push({ from: `t${i}`, n: 1, to: `c${firstCell}` })
  })
  // Prefer builds that empty a column or uncover more of it.
  build.sort((a, b) => columnLeft(state, a) - columnLeft(state, b))
  return [...foundation, ...build, ...toEmpty, ...toCell]
}

const columnLeft = (state: State, move: Move) =>
  move.from[0] === 't' ? state.t[index(move.from)]!.length - move.n : 99

function key(state: State): string {
  return `${state.t
    .map((pile) => pile.join(','))
    .sort()
    .join('|')}#${[...state.c].sort((a, b) => a - b).join(',')}#${state.f.map((p) => p.length).join(',')}`
}

function isMove(value: unknown): value is Move {
  if (typeof value !== 'object' || value === null) return false
  const m = value as Partial<Move>
  return (
    typeof m.from === 'string' &&
    typeof m.to === 'string' &&
    /^(c[0-3]|t[0-7])$/.test(m.from) &&
    /^(c[0-3]|t[0-7]|f[0-3])$/.test(m.to) &&
    Number.isInteger(m.n) &&
    (m.n as number) >= 1 &&
    (m.n as number) <= 13
  )
}

export const rules: CardRules<State, Move, Variant> = { variants: VARIANTS, deal, apply, isWon, solverMoves, key, isMove }

// --- Helpers for the play view -----------------------------------------------------------

function pileLength(state: State, pile: string): number {
  if (pile[0] === 'c') return (state.c[index(pile)] ?? -1) >= 0 ? 1 : 0
  if (pile[0] === 'f') return state.f[index(pile)]?.length ?? 0
  return state.t[index(pile)]?.length ?? 0
}

export function canPick(state: State, pile: string, from: number): boolean {
  if (pile[0] === 'f') return false
  const length = pileLength(state, pile)
  return from >= 0 && from < length && takeable(state, pile, length - from) !== null
}

export function dropMove(state: State, from: string, at: number, to: string): Move | null {
  const move: Move = { from, n: pileLength(state, from) - at, to }
  return apply(state, move) ? move : null
}

/** Foundation if possible, then the best column, then a free cell, then an empty column. */
export function tapMove(state: State, pile: string, at: number): Move | null {
  if (!canPick(state, pile, at)) return null
  const n = pileLength(state, pile) - at
  const cards = takeable(state, pile, n)!
  if (n === 1) {
    const to = `f${DECK[cards[0]!]!.suit}`
    if (fits(state, cards, to)) return { from: pile, n, to }
  }
  for (let j = 0; j < 8; j++) {
    const to = `t${j}`
    if (to !== pile && state.t[j]!.length && fits(state, cards, to)) return { from: pile, n, to }
  }
  if (n === 1 && pile[0] === 't') {
    const cell = state.c.findIndex((card) => card < 0)
    if (cell >= 0) return { from: pile, n, to: `c${cell}` }
  }
  const empty = state.t.findIndex((p) => p.length === 0)
  if (empty >= 0 && fits(state, cards, `t${empty}`) && !(pile[0] === 't' && at === 0)) {
    return { from: pile, n, to: `t${empty}` }
  }
  return null
}

/** When every column is in descending order, the remaining cards go up one by one. */
export function autoFinish(state: State): Move[] | null {
  const ordered = state.t.every((pile) => pile.every((id, i) => i === 0 || DECK[pile[i - 1]!]!.rank > DECK[id]!.rank))
  if (!ordered || isWon(state)) return null
  const moves: Move[] = []
  let current = state
  while (!isWon(current)) {
    const next = sources(current)
      .filter(({ id }) => fits(current, [id], `f${DECK[id]!.suit}`))
      .sort((a, b) => DECK[a.id]!.rank - DECK[b.id]!.rank)[0]
    if (!next) return null
    const move: Move = { from: next.pile, n: 1, to: `f${DECK[next.id]!.suit}` }
    current = apply(current, move)!.state
    moves.push(move)
  }
  return moves
}
