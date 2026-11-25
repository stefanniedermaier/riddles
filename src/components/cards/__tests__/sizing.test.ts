import { describe, expect, it } from 'vitest'

import { cardWidth } from '../sizing'
import type { PileView } from '../types'

const pile = (x: number, y: number, fan: PileView['fan']): PileView => ({ id: `p${x}${y}`, x, y, slots: [], fan, label: '' })
// Seven columns below a row of stock and foundations (Solitaire, portrait).
const normal = [pile(0, 0, 'none'), ...Array.from({ length: 7 }, (_, i) => pile(i, 1, 'down'))]
// The same game with stock and foundations beside the columns.
const wide = [pile(0, 0, 'none'), pile(0, 1, 'none'), ...Array.from({ length: 7 }, (_, i) => pile(1.7 + i, 0, 'down'))]

describe('cardWidth', () => {
  it('fills the width on a tall area', () => {
    expect(cardWidth(normal, 7, 358, 600)).toBeCloseTo((358 - 30) / 7)
  })

  it('shrinks the cards so that the piles fit a low area', () => {
    const width = cardWidth(normal, 7, 800, 200)
    // Two rows plus room for a fanned column must fit 200 px.
    expect(width * 1.4 * 3.6 + 10 + 4).toBeLessThanOrEqual(200.001)
  })

  it('gives larger cards with the wide layout in landscape, smaller ones in portrait', () => {
    expect(cardWidth(wide, 10.9, 800, 200)).toBeGreaterThan(cardWidth(normal, 7, 800, 200))
    expect(cardWidth(wide, 10.9, 358, 600)).toBeLessThan(cardWidth(normal, 7, 358, 600))
  })

  it('keeps between 20 and 110 px and ignores an unmeasured height', () => {
    expect(cardWidth(normal, 7, 2000, 0)).toBe(110)
    expect(cardWidth(normal, 7, 100, 0)).toBe(20)
  })
})
