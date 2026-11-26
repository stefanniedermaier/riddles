import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { settings } from '@/core/settings'
import MinesBoard from '../MinesBoard.vue'
import { COVERED, FLAGGED, REVEALED, type CellState } from '../logic/types'

// 3×3: top-left revealed "1", a flag in the middle, the rest covered.
const cells: CellState[] = [REVEALED, COVERED, COVERED, COVERED, FLAGGED, COVERED, COVERED, COVERED, COVERED]
const counts = [1, 1, 1, 1, 0, 1, 1, 1, 1]

function mountBoard(props: Record<string, unknown> = {}) {
  settings.value.locale = 'en'
  const wrapper = mount(MinesBoard, {
    props: { width: 3, height: 3, cells, counts, longPress: true, ...props },
  })
  const el = wrapper.find('.mines-board').element as HTMLElement
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 300, height: 300, right: 300, bottom: 300, x: 0, y: 0 }) as DOMRect
  Object.defineProperty(el, 'clientWidth', { value: 300 })
  Object.defineProperty(el, 'clientHeight', { value: 300 })
  return wrapper
}

describe('MinesBoard', () => {
  afterEach(() => vi.useRealTimers())

  it('labels numbers, flags, covered cells and shown mines', () => {
    const wrapper = mountBoard({ mines: new Set([8]), hit: null, wrong: new Set([4]) })
    expect(wrapper.findAll('.cell')).toHaveLength(9)
    expect(wrapper.find('[data-cell="0"]').attributes('aria-label')).toBe('row 1, column 1, 1 nearby')
    expect(wrapper.find('[data-cell="1"]').attributes('aria-label')).toBe('row 1, column 2, covered')
    expect(wrapper.find('[data-cell="4"]').attributes('aria-label')).toBe('row 2, column 2, wrong flag')
    expect(wrapper.find('[data-cell="8"]').attributes('aria-label')).toBe('row 3, column 3, mine')
  })

  it('taps on press and release, long press does the other action once', async () => {
    vi.useFakeTimers()
    const wrapper = mountBoard()
    const board = wrapper.find('.mines-board')
    await board.trigger('pointerdown', { clientX: 150, clientY: 50, pointerId: 1 }) // cell 1
    await board.trigger('pointerup', { clientX: 150, clientY: 50, pointerId: 1 })
    expect(wrapper.emitted('tap')).toEqual([[1]])

    await board.trigger('pointerdown', { clientX: 250, clientY: 250, pointerId: 2 }) // cell 8
    expect(wrapper.find('[data-cell="8"]').classes()).toContain('cell--pressing')
    vi.advanceTimersByTime(400)
    await board.trigger('pointerup', { clientX: 250, clientY: 250, pointerId: 2 })
    expect(wrapper.emitted('alt')).toEqual([[8]])
    expect(wrapper.emitted('tap')).toHaveLength(1)
  })

  it('a second finger (pinch to zoom) cancels the tap and the long press', async () => {
    vi.useFakeTimers()
    const wrapper = mountBoard()
    const board = wrapper.find('.mines-board')
    await board.trigger('pointerdown', { clientX: 150, clientY: 50, pointerId: 1, isPrimary: true })
    await board.trigger('pointerdown', { clientX: 250, clientY: 250, pointerId: 2, isPrimary: false })
    vi.advanceTimersByTime(400)
    await board.trigger('pointerup', { clientX: 150, clientY: 50, pointerId: 1, isPrimary: true })
    await board.trigger('pointerup', { clientX: 250, clientY: 250, pointerId: 2, isPrimary: false })
    expect(wrapper.emitted('tap')).toBeUndefined()
    expect(wrapper.emitted('alt')).toBeUndefined()
  })

  it('cancels when the finger moves to another cell; right click is the other action', async () => {
    const wrapper = mountBoard()
    const board = wrapper.find('.mines-board')
    await board.trigger('pointerdown', { clientX: 50, clientY: 250, pointerId: 1 })
    await board.trigger('pointermove', { clientX: 150, clientY: 250, pointerId: 1 })
    await board.trigger('pointerup', { clientX: 150, clientY: 250, pointerId: 1 })
    expect(wrapper.emitted('tap')).toBeUndefined()
    await board.trigger('pointerdown', { clientX: 50, clientY: 250, pointerId: 3, pointerType: 'mouse', button: 2 })
    expect(wrapper.emitted('alt')).toEqual([[6]])
  })

  it('supports the keyboard', async () => {
    const wrapper = mountBoard()
    const board = wrapper.find('.mines-board')
    await board.trigger('keydown', { key: 'ArrowRight' })
    await board.trigger('keydown', { key: 'ArrowDown' })
    await board.trigger('keydown', { key: 'Enter' })
    await board.trigger('keydown', { key: 'f' })
    expect(wrapper.emitted('tap')).toEqual([[4]])
    expect(wrapper.emitted('flag')).toEqual([[4]])
  })
})
