/**
 * Playing cards for the patience games.
 *
 * A card is identified by its index in the game's deck (`CardDef[]`). Piles store **slots**:
 * the card id for a face-up card and `-id - 1` for a face-down card – compact, serialisable
 * and cheap to copy.
 */
import type { Rng } from '../rng'

/** ♠ 0, ♥ 1, ♦ 2, ♣ 3. */
export type Suit = 0 | 1 | 2 | 3
const SUITS: readonly Suit[] = [0, 1, 2, 3]

export interface CardDef {
  suit: Suit
  /** 1 = ace … 11 = jack, 12 = queen, 13 = king. */
  rank: number
}

/** A pile entry: card id if face up, `-id - 1` if face down. */
export type Slot = number

export const isUp = (slot: Slot): boolean => slot >= 0
export const idOf = (slot: Slot): number => (slot >= 0 ? slot : -slot - 1)
export const faceDown = (id: number): Slot => -id - 1
export const faceUp = (slot: Slot): Slot => idOf(slot)

export const isRed = (suit: Suit): boolean => suit === 1 || suit === 2

/**
 * `decks` full decks of 52 cards whose suits cycle through `suits` (Spider with one or two
 * suits uses 8 or 4 sets of the same suits). Card `i` has rank `i % 13 + 1`.
 */
export function makeDeck(decks = 1, suits: readonly Suit[] = SUITS): CardDef[] {
  return Array.from({ length: decks * 52 }, (_, id) => ({
    suit: suits[Math.floor(id / 13) % suits.length]!,
    rank: (id % 13) + 1,
  }))
}

/** Card ids 0 … n − 1 in random order. */
export function shuffledIds(count: number, rng: Rng): number[] {
  return rng.shuffle(Array.from({ length: count }, (_, i) => i))
}

export const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const
