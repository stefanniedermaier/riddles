import type { CardDef } from '@/core/cards/cards'
import { t } from '@/core/i18n'

/** "7 of hearts" / "Herz 7". */
export function cardName(deck: readonly CardDef[], id: number): string {
  const card = deck[id]
  if (!card) return ''
  return t('cards.card', {
    rank: t(`cards.ranks.r${card.rank}` as 'cards.ranks.r1'),
    suit: t(`cards.suits.s${card.suit}` as 'cards.suits.s0'),
  })
}

/** "Column 3", "Foundation 1", "Free cell 2", "Stock", "Waste". */
export function pileName(id: string): string {
  const kind = id[0] as 's' | 'w' | 'f' | 't' | 'c' | 'p'
  return t(`cards.piles.${kind}`, { n: Number(id.slice(1)) + 1 })
}

/** Accessible label of a pile: name plus top card or count. */
export function pileLabel(deck: readonly CardDef[], id: string, cards: readonly number[]): string {
  const name = pileName(id)
  if (!cards.length) return t('cards.pileEmpty', { pile: name })
  const top = cards[cards.length - 1]!
  return top >= 0 ? t('cards.pileTop', { pile: name, card: cardName(deck, top) }) : t('cards.pileCount', { pile: name, count: cards.length })
}
