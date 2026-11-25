/**
 * TriPeaks rules as a pure state machine.
 *
 * 28 cards in three overlapping peaks (rows of 3, 6, 9 and 10), indexed top row first.
 * Piles for the view: `p0`–`p27` peak cards, `w` waste, `s` stock.
 */
import { makeDeck, shuffledIds, type CardDef } from '@/core/cards/cards'
import type { Applied, CardRules } from '@/core/cards/game'
import { createRng, hashSeed } from '@/core/rng'

import { VARIANTS, type Variant } from './variants'

export { VARIANTS, type Variant }


/** Ace and king connect (K–A–2). */
const WRAP: Record<Variant, boolean> = { easy: true, medium: false, hard: false }

export const DECK: CardDef[] = makeDeck(1)

/** Horizontal position (in card widths) and row of every peak card. */
export const POSITIONS: { x: number; row: number }[] = [
  ...[1.5, 4.5, 7.5].map((x) => ({ x, row: 0 })),
  ...[1, 2, 4, 5, 7, 8].map((x) => ({ x, row: 1 })),
  ...Array.from({ length: 9 }, (_, i) => ({ x: i + 0.5, row: 2 })),
  ...Array.from({ length: 10 }, (_, i) => ({ x: i, row: 3 })),
]

/** Peak cards that cover each card (the cards half a card to the left and right one row lower). */
export const COVERED_BY: number[][] = POSITIONS.map((p) =>
  POSITIONS.flatMap((q, j) => (q.row === p.row + 1 && Math.abs(q.x - p.x) === 0.5 ? [j] : [])),
)

export interface State {
  variant: Variant
  /** Card id per peak position. */
  peaks: number[]
  /** Bit i set = peak card i removed. */
  removed: number
  /** Stock, top = last. */
  s: number[]
  /** Waste, top = last. */
  w: number[]
  /** Cards removed in a row since the last card from the stock. */
  streak: number
}

export type Move = { k: 'play'; i: number } | { k: 'draw' }

const ALL_REMOVED = 2 ** 28 - 1

export function deal(variant: Variant, seed: number): State {
  const ids = shuffledIds(52, createRng(hashSeed('tripeaks', seed)))
  return { variant, peaks: ids.slice(0, 28), removed: 0, s: ids.slice(29), w: [ids[28]!], streak: 0 }
}

export const isRemoved = (state: State, i: number): boolean => (state.removed & (1 << i)) !== 0

/** A peak card is face up (and playable) when the cards covering it are gone. */
export const isFree = (state: State, i: number): boolean =>
  !isRemoved(state, i) && COVERED_BY[i]!.every((j) => isRemoved(state, j))

function fitsWaste(state: State, id: number): boolean {
  const top = state.w[state.w.length - 1]
  if (top === undefined) return false
  const a = DECK[id]!.rank
  const b = DECK[top]!.rank
  return Math.abs(a - b) === 1 || (WRAP[state.variant] && Math.abs(a - b) === 12)
}

export function apply(state: State, move: Move): Applied<State> | null {
  if (move.k === 'draw') {
    if (!state.s.length) return null
    const s = [...state.s]
    return { state: { ...state, s, w: [...state.w, s.pop()!], streak: 0 }, points: 0 }
  }
  const { i } = move
  if (!Number.isInteger(i) || i < 0 || i >= 28 || !isFree(state, i)) return null
  const id = state.peaks[i]!
  if (!fitsWaste(state, id)) return null
  const streak = state.streak + 1
  const removed = state.removed | (1 << i)
  let points = streak * 10
  if (i < 3) {
    const cleared = [0, 1, 2].filter((p) => (removed & (1 << p)) !== 0).length
    points += cleared === 3 ? 1000 : 250
  }
  return { state: { ...state, removed, w: [...state.w, id], streak }, points }
}

export const isWon = (state: State): boolean => state.removed === ALL_REMOVED

/** No card fits and the stock is empty. */
export const isStuck = (state: State): boolean =>
  !isWon(state) && !state.s.length && !POSITIONS.some((_, i) => isFree(state, i) && fitsWaste(state, state.peaks[i]!))

function solverMoves(state: State): Move[] {
  const plays: { move: Move; score: number }[] = []
  POSITIONS.forEach((_, i) => {
    if (isFree(state, i) && fitsWaste(state, state.peaks[i]!)) {
      // Prefer cards that free others (higher rows first).
      plays.push({ move: { k: 'play', i }, score: COVERED_BY.filter((list) => list.includes(i)).length })
    }
  })
  plays.sort((a, b) => b.score - a.score)
  return [...plays.map((p) => p.move), ...(state.s.length ? [{ k: 'draw' } as Move] : [])]
}

const key = (state: State): string => `${state.removed}#${state.s.length}#${state.w[state.w.length - 1]}`

function isMove(value: unknown): value is Move {
  if (typeof value !== 'object' || value === null) return false
  const m = value as { k?: unknown; i?: unknown }
  return m.k === 'draw' || (m.k === 'play' && Number.isInteger(m.i) && (m.i as number) >= 0 && (m.i as number) < 28)
}

export const rules: CardRules<State, Move, Variant> = { variants: VARIANTS, deal, apply, isWon, solverMoves, key, isMove }

/** Extra points at a win: 50 per card left in the stock. */
export const winPoints = (state: State): number => state.s.length * 50
