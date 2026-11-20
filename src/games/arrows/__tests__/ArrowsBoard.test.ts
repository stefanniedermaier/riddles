import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { settings } from '@/core/settings'
import ArrowsBoard from '../ArrowsBoard.vue'
import { chainPuzzle } from '../logic/__tests__/helpers'

function mountBoard(removed: number[] = []) {
  settings.value.locale = 'en'
  const puzzle = chainPuzzle()
  const wrapper = mount(ArrowsBoard, {
    props: { size: 3, arrows: puzzle.arrows, removed, leaving: [] },
  })
  const el = wrapper.find('.arrows-board').element as HTMLElement
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 306, height: 306, right: 306, bottom: 306, x: 0, y: 0 }) as DOMRect
  Object.defineProperty(el, 'clientLeft', { value: 3 })
  Object.defineProperty(el, 'clientTop', { value: 3 })
  Object.defineProperty(el, 'clientWidth', { value: 300 })
  Object.defineProperty(el, 'clientHeight', { value: 300 })
  return wrapper
}

describe('ArrowsBoard', () => {
  it('draws one group per arrow still on the board, labelled per cell', () => {
    const wrapper = mountBoard([2])
    expect(wrapper.findAll('[data-arrow]')).toHaveLength(2)
    expect(wrapper.findAll('.cell')).toHaveLength(9)
    expect(wrapper.find('[data-cell="0"]').attributes('aria-label')).toBe('row 1, column 1, arrow pointing right')
    expect(wrapper.find('[data-cell="4"]').attributes('aria-label')).toBe('row 2, column 2')
  })

  it('emits a tap for press and release on the same cell (border excluded)', async () => {
    const wrapper = mountBoard()
    const board = wrapper.find('.arrows-board')
    // x = 104 → 101 px inside the content box → column 1; y = 4 → row 0 → cell 1
    await board.trigger('pointerdown', { clientX: 104, clientY: 4, pointerId: 1 })
    await board.trigger('pointerup', { clientX: 104, clientY: 4, pointerId: 1 })
    expect(wrapper.emitted('tap')).toEqual([[1]])
  })

  it('accepts a release on another cell of the same arrow but not elsewhere', async () => {
    const wrapper = mountBoard()
    const board = wrapper.find('.arrows-board')
    await board.trigger('pointerdown', { clientX: 50, clientY: 50, pointerId: 1 }) // cell 0 (arrow A)
    await board.trigger('pointerup', { clientX: 150, clientY: 50, pointerId: 1 }) // cell 1 (arrow A)
    await board.trigger('pointerdown', { clientX: 50, clientY: 50, pointerId: 2 })
    await board.trigger('pointerup', { clientX: 50, clientY: 250, pointerId: 2 }) // cell 6 (empty)
    expect(wrapper.emitted('tap')).toEqual([[0]])
  })

  it('supports the keyboard', async () => {
    const wrapper = mountBoard()
    const board = wrapper.find('.arrows-board')
    await board.trigger('keydown', { key: 'ArrowRight' })
    await board.trigger('keydown', { key: 'ArrowRight' })
    await board.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('tap')).toEqual([[2]])
  })
})
