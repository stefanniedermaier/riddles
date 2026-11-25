import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { faceDown, makeDeck } from '@/core/cards/cards'
import { settings } from '@/core/settings'
import CardTable from '../CardTable.vue'
import type { PileView } from '../types'

const deck = makeDeck(1)
// Column 0: face-down card + 9♠; column 1: 10♥; column 2: empty.
const piles: PileView[] = [
  { id: 't0', x: 0, y: 0, slots: [faceDown(5), 8], fan: 'down', label: 'Column 1' },
  { id: 't1', x: 1, y: 0, slots: [22], fan: 'down', label: 'Column 2' },
  { id: 't2', x: 2, y: 0, slots: [], fan: 'down', placeholder: 'K', label: 'Column 3: empty' },
]

function mountTable() {
  settings.value.locale = 'en'
  const wrapper = mount(CardTable, {
    props: { piles, deck, columns: 3, canPick: (pile: string, index: number) => pile === 't0' ? index === 1 : pile === 't1' },
    attachTo: document.body,
  })
  const el = wrapper.find('.card-table').element as HTMLElement
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 500, right: 300, bottom: 500, x: 0, y: 0 }) as DOMRect
  el.setPointerCapture = () => {}
  return wrapper
}

describe('CardTable', () => {
  it('renders cards with labels; face-down cards stay hidden from screen readers', () => {
    const wrapper = mountTable()
    expect(wrapper.findAll('.card')).toHaveLength(3)
    expect(wrapper.find('[data-pile="t0"][data-index="1"]').attributes('aria-label')).toBe('Column 1: 9 of spades')
    expect(wrapper.find('[data-pile="t0"][data-index="0"]').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.slot[data-pile="t2"]').attributes('aria-label')).toBe('Column 3: empty')
    wrapper.unmount()
  })

  it('emits a tap for press and release, and a drop after dragging onto another pile', async () => {
    const wrapper = mountTable()
    const card = wrapper.find('[data-pile="t0"][data-index="1"]')
    const table = wrapper.find('.card-table')
    await card.trigger('pointerdown', { pointerId: 1, clientX: 40, clientY: 60, button: 0 })
    await table.trigger('pointerup', { pointerId: 1, clientX: 40, clientY: 60 })
    expect(wrapper.emitted('tap')).toEqual([['t0', 1]])

    // Card width ≈ (300 − 10) / 3 ≈ 96.7 px: column 2 starts at ≈ 101 px.
    await card.trigger('pointerdown', { pointerId: 2, clientX: 40, clientY: 60, button: 0 })
    await table.trigger('pointermove', { pointerId: 2, clientX: 150, clientY: 70 })
    expect(wrapper.find('[data-pile="t0"][data-index="1"]').classes()).toContain('card--dragged')
    await table.trigger('pointerup', { pointerId: 2, clientX: 150, clientY: 70 })
    expect(wrapper.emitted('drop')).toEqual([['t0', 1, 't1']])
    wrapper.unmount()
  })

  it('does not drag cards that cannot be picked up', async () => {
    const wrapper = mountTable()
    const table = wrapper.find('.card-table')
    await wrapper.find('[data-pile="t0"][data-index="0"]').trigger('pointerdown', { pointerId: 1, clientX: 40, clientY: 10, button: 0 })
    await table.trigger('pointermove', { pointerId: 1, clientX: 150, clientY: 70 })
    await table.trigger('pointerup', { pointerId: 1, clientX: 150, clientY: 70 })
    expect(wrapper.emitted('drop')).toBeUndefined()
    wrapper.unmount()
  })

  it('moves a single tab stop with the arrow keys and taps with Enter', async () => {
    const wrapper = mountTable()
    expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1)
    await wrapper.find('.card-table').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.find('[tabindex="0"]').attributes('data-pile')).toBe('t1')
    await wrapper.find('.card-table').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('tap')).toEqual([['t1', 0]])
    wrapper.unmount()
  })
})
