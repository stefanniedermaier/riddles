/**
 * Solitaire (Klondike) rules as a pure state machine.
 *
 * Piles: `t0`–`t6` tableau, `f0`–`f3` foundations (one per suit), `w` waste, `s` stock.
 */
import { faceDown, idOf, isRed, isUp, makeDeck, shuffledIds, type CardDef, type Slot } from '@/core/cards/cards'
import type { Applied, CardRules } from '@/core/cards/game'
import { createRng, hashSeed } from '@/core/rng'

import { VARIANTS, type Variant } from './variants'

export { VARIANTS, type Variant }


interface VariantRules {
  draw: 1 | 3
  /** How often the waste may be turned over (Infinity = unlimited). */
  recycles: number
}

export const VARIANT_RULES: Record<Variant, VariantRules> = {
  draw1: { draw: 1, recycles: Infinity },
  'draw1-1pass': { draw: 1, recycles: 0 },
  draw3: { draw: 3, recycles: Infinity },
  'draw3-3pass': { draw: 3, recycles: 2 },
}

export const DECK: CardDef[] = makeDeck(1)
const card = (slot: Slot) => DECK[idOf(slot)]!

export interface State {
  variant: Variant
  t: Slot[][]
  /** Foundation per suit (card ids, ace first). */
  f: number[][]
  /** Stock, face down, top = last. */
  s: Slot[]
  /** Waste, face up, top = last. */
  w: number[]
  recycles: number
}

export type Move = { k: 'draw' } | { k: 'recycle' } | { k: 'move'; from: string; n: number; to: string }

export function deal(variant: Variant, seed: number): State {
  const ids = shuffledIds(52, createRng(hashSeed('solitaire', seed)))
  const t: Slot[][] = []
  let next = 0
  for (let col = 0; col < 7; col++) {
    const pile: Slot[] = []
    for (let i = 0; i <= col; i++) {
      const id = ids[next++]!
      pile.push(i === col ? id : faceDown(id))
    }
    t.push(pile)
  }
  return { variant, t, f: [[], [], [], []], s: ids.slice(next).map(faceDown), w: [], recycles: 0 }
}

/** Passes through the stock that are still allowed (Infinity = unlimited). */
export const recyclesLeft = (state: State): number => VARIANT_RULES[state.variant].recycles - state.recycles

const pileIndex = (id: string): number => Number(id.slice(1))

/** The cards that would move: `n` from the top of pile `from` (all face up), or null. */
function takeable(state: State, from: string, n: number): number[] | null {
  if (n < 1) return null
  if (from === 'w') return n === 1 && state.w.length ? [state.w[state.w.length - 1]!] : null
  if (from[0] === 'f') {
    const pile = state.f[pileIndex(from)]
    return pile && n === 1 && pile.length ? [pile[pile.length - 1]!] : null
  }
  if (from[0] === 't') {
    const pile = state.t[pileIndex(from)]
    if (!pile || n > pile.length) return null
    const run = pile.slice(pile.length - n)
    if (!run.every(isUp)) return null
    for (let i = 1; i < run.length; i++) {
      const a = card(run[i - 1]!)
      const b = card(run[i]!)
      if (a.rank !== b.rank + 1 || isRed(a.suit) === isRed(b.suit)) return null
    }
    return run
  }
  return null
}

/** Whether `cards` (bottom first) may be placed on pile `to`. */
function fits(state: State, cards: number[], to: string): boolean {
  const first = DECK[cards[0]!]!
  if (to[0] === 'f') {
    const index = pileIndex(to)
    const pile = state.f[index]
    return !!pile && cards.length === 1 && first.suit === index && first.rank === pile.length + 1
  }
  if (to[0] === 't') {
    const pile = state.t[pileIndex(to)]
    if (!pile) return false
    if (pile.length === 0) return first.rank === 13
    const top = pile[pile.length - 1]!
    if (!isUp(top)) return false
    const target = card(top)
    return target.rank === first.rank + 1 && isRed(target.suit) !== isRed(first.suit)
  }
  return false
}

export function apply(state: State, move: Move): Applied<State> | null {
  const rules = VARIANT_RULES[state.variant]
  if (move.k === 'draw') {
    if (state.s.length === 0) return null
    const s = [...state.s]
    const w = [...state.w]
    for (let i = 0; i < rules.draw && s.length > 0; i++) w.push(idOf(s.pop()!))
    return { state: { ...state, s, w }, points: 0 }
  }
  if (move.k === 'recycle') {
    if (state.s.length > 0 || state.w.length === 0 || state.recycles >= rules.recycles) return null
    const points = state.recycles === 0 ? 0 : rules.draw === 1 ? -50 : -20
    return {
      state: { ...state, s: [...state.w].reverse().map(faceDown), w: [], recycles: state.recycles + 1 },
      points,
    }
  }
  const { from, to, n } = move
  if (from === to) return null
  const cards = takeable(state, from, n)
  if (!cards || !fits(state, cards, to)) return null

  const next: State = { ...state, t: [...state.t], f: [...state.f] }
  let points = 0
  // Take the cards off the source pile.
  if (from === 'w') next.w = state.w.slice(0, -1)
  else if (from[0] === 'f') next.f[pileIndex(from)] = state.f[pileIndex(from)]!.slice(0, -1)
  else {
    const index = pileIndex(from)
    const rest = state.t[index]!.slice(0, -n)
    const top = rest[rest.length - 1]
    if (top !== undefined && !isUp(top)) {
      rest[rest.length - 1] = idOf(top)
      points += 5 // turning up a card
    }
    next.t[index] = rest
  }
  // Put them on the target.
  if (to[0] === 'f') {
    next.f[pileIndex(to)] = [...state.f[pileIndex(to)]!, ...cards]
    if (from !== to && from[0] !== 'f') points += 10
  } else {
    next.t[pileIndex(to)] = [...next.t[pileIndex(to)]!, ...cards]
    if (from === 'w') points += 5
    if (from[0] === 'f') points -= 15
  }
  return { state: next, points }
}

export const isWon = (state: State): boolean => state.f.every((pile) => pile.length === 13)

/** A card that can go to its foundation without ever being needed in the tableau. */
function isSafeForFoundation(state: State, id: number): boolean {
  const { suit, rank } = DECK[id]!
  if (rank <= 2) return true
  const opposite = isRed(suit) ? [0, 3] : [1, 2]
  return opposite.every((s) => state.f[s]!.length >= rank - 1)
}

/** Sources of single top cards: waste and tableau tops. */
function tops(state: State): { pile: string; id: number }[] {
  const list: { pile: string; id: number }[] = []
  if (state.w.length) list.push({ pile: 'w', id: state.w[state.w.length - 1]! })
  state.t.forEach((pile, i) => {
    const top = pile[pile.length - 1]
    if (top !== undefined && isUp(top)) list.push({ pile: `t${i}`, id: top })
  })
  return list
}

function solverMoves(state: State): Move[] {
  const toFoundation: Move[] = []
  for (const { pile, id } of tops(state)) {
    const to = `f${DECK[id]!.suit}`
    if (fits(state, [id], to)) {
      const move: Move = { k: 'move', from: pile, n: 1, to }
      if (isSafeForFoundation(state, id)) return [move] // forced: never wrong
      toFoundation.push(move)
    }
  }
  const uncovering: Move[] = []
  const fromWaste: Move[] = []
  const other: Move[] = []
  state.t.forEach((pile, i) => {
    const firstUp = pile.findIndex(isUp)
    if (firstUp < 0) return
    for (let start = firstUp; start < pile.length; start++) {
      const n = pile.length - start
      const cards = takeable(state, `t${i}`, n)
      if (!cards) continue
      for (let j = 0; j < 7; j++) {
        if (j === i || !fits(state, cards, `t${j}`)) continue
        const move: Move = { k: 'move', from: `t${i}`, n, to: `t${j}` }
        if (start === firstUp && firstUp > 0) uncovering.push(move)
        else if (start === firstUp) {
          // A whole column moves: only useful onto a non-empty column (a king to an empty one
          // changes nothing).
          if (state.t[j]!.length > 0) other.push(move)
        } else {
          // Splitting a run only helps if the card it uncovers can go to its foundation or
          // can take the waste card (needed when the stock cannot be turned over again).
          const exposed = idOf(pile[start - 1]!)
          const wasteTop = state.w[state.w.length - 1]
          const takesWaste =
            wasteTop !== undefined &&
            DECK[exposed]!.rank === DECK[wasteTop]!.rank + 1 &&
            isRed(DECK[exposed]!.suit) !== isRed(DECK[wasteTop]!.suit)
          if (takesWaste || fits(state, [exposed], `f${DECK[exposed]!.suit}`)) other.push(move)
        }
      }
    }
  })
  if (state.w.length) {
    const id = state.w[state.w.length - 1]!
    for (let j = 0; j < 7; j++) if (fits(state, [id], `t${j}`)) fromWaste.push({ k: 'move', from: 'w', n: 1, to: `t${j}` })
  }
  const fromFoundation: Move[] = []
  state.f.forEach((pile, i) => {
    if (!pile.length) return
    for (let j = 0; j < 7; j++) {
      if (fits(state, [pile[pile.length - 1]!], `t${j}`) && state.t[j]!.length > 0) {
        fromFoundation.push({ k: 'move', from: `f${i}`, n: 1, to: `t${j}` })
      }
    }
  })
  const stock: Move[] = []
  if (state.s.length) stock.push({ k: 'draw' })
  else if (state.w.length && state.recycles < VARIANT_RULES[state.variant].recycles) stock.push({ k: 'recycle' })
  return [...toFoundation, ...uncovering, ...fromWaste, ...other, ...stock, ...fromFoundation]
}

function key(state: State): string {
  const columns = state.t.map((pile) => pile.join(',')).sort()
  return `${columns.join('|')}#${state.f.map((p) => p.length).join(',')}#${state.s.join(',')}#${state.w.join(',')}#${
    Number.isFinite(VARIANT_RULES[state.variant].recycles) ? state.recycles : 0
  }`
}

function isMove(value: unknown): value is Move {
  if (typeof value !== 'object' || value === null) return false
  const m = value as { k?: unknown; from?: unknown; to?: unknown; n?: unknown }
  if (m.k === 'draw' || m.k === 'recycle') return true
  return (
    m.k === 'move' &&
    typeof m.from === 'string' &&
    typeof m.to === 'string' &&
    /^(w|f[0-3]|t[0-6])$/.test(m.from) &&
    /^(f[0-3]|t[0-6])$/.test(m.to) &&
    Number.isInteger(m.n) &&
    (m.n as number) >= 1 &&
    (m.n as number) <= 13
  )
}

export const rules: CardRules<State, Move, Variant> = {
  variants: VARIANTS,
  deal,
  apply,
  isWon,
  solverMoves,
  key,
  isMove,
}

// --- Helpers for the play view -----------------------------------------------------------

/** Whether a player may pick up the cards from `index` on in `pile`. */
export function canPick(state: State, pile: string, index: number): boolean {
  const length = pileLength(state, pile)
  return index >= 0 && index < length && takeable(state, pile, length - index) !== null
}

function pileLength(state: State, pile: string): number {
  if (pile === 'w') return state.w.length
  if (pile === 's') return state.s.length
  if (pile[0] === 'f') return state.f[pileIndex(pile)]?.length ?? 0
  return state.t[pileIndex(pile)]?.length ?? 0
}

/** The move for dropping the cards from `index` on in `from` onto `to`, if legal. */
export function dropMove(state: State, from: string, index: number, to: string): Move | null {
  const move: Move = { k: 'move', from, n: pileLength(state, from) - index, to }
  return apply(state, move) ? move : null
}

/** Tapping: deal from the stock, or the best place for the tapped cards. */
export function tapMove(state: State, pile: string, index: number): Move | null {
  if (pile === 's') {
    const move: Move = state.s.length ? { k: 'draw' } : { k: 'recycle' }
    return apply(state, move) ? move : null
  }
  if (!canPick(state, pile, index)) return null
  const n = pileLength(state, pile) - index
  const cards = takeable(state, pile, n)!
  if (n === 1 && pile[0] !== 'f') {
    const to = `f${DECK[cards[0]!]!.suit}`
    if (fits(state, cards, to)) return { k: 'move', from: pile, n, to }
  }
  let best: Move | null = null
  let bestScore = -Infinity
  for (let j = 0; j < 7; j++) {
    const to = `t${j}`
    if (to === pile || !fits(state, cards, to)) continue
    const empty = state.t[j]!.length === 0
    // Prefer non-empty targets, and moves that uncover a card or empty a column.
    const score = (empty ? -2 : 0) + (pile[0] === 't' && index === 0 ? 0 : 1) - j / 100
    if (score > bestScore) {
      bestScore = score
      best = { k: 'move', from: pile, n, to }
    }
  }
  return best
}

/** When the stock and waste are empty and every card is face up: the moves that finish. */
export function autoFinish(state: State): Move[] | null {
  if (state.s.length || state.w.length || state.t.some((pile) => pile.some((slot) => !isUp(slot)))) return null
  const moves: Move[] = []
  let current = state
  while (!isWon(current)) {
    const next = tops(current)
      .filter(({ id }) => fits(current, [id], `f${DECK[id]!.suit}`))
      .sort((a, b) => DECK[a.id]!.rank - DECK[b.id]!.rank)[0]
    if (!next) return null
    const move: Move = { k: 'move', from: next.pile, n: 1, to: `f${DECK[next.id]!.suit}` }
    current = apply(current, move)!.state
    moves.push(move)
  }
  return moves
}
