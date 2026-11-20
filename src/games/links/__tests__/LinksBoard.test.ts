import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LinksBoard from '../LinksBoard.vue'
import { SMALL } from '../logic/__tests__/helpers'

function mountBoard() {
  const wrapper = mount(LinksBoard, {
    props: {
      size: 3,
      endpoints: SMALL.endpoints,
      paths: [[0, 1], [], []],
      connected: [false, false, false],
    },
  })
  const el = wrapper.find('.links-board').element as HTMLElement
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 306, height: 306, right: 306, bottom: 306, x: 0, y: 0 }) as DOMRect
  Object.defineProperty(el, 'clientLeft', { value: 3 })
  Object.defineProperty(el, 'clientTop', { value: 3 })
  Object.defineProperty(el, 'clientWidth', { value: 300 })
  Object.defineProperty(el, 'clientHeight', { value: 300 })
  return wrapper
}

const at = (x: number, y: number) => ({ clientX: x, clientY: y, pointerId: 1 })

describe('LinksBoard', () => {
  it('renders cells, dots and lines', () => {
    const wrapper = mountBoard()
    expect(wrapper.findAll('.cell')).toHaveLength(9)
    expect(wrapper.findAll('.dot')).toHaveLength(6)
    expect(wrapper.findAll('.line')).toHaveLength(1)
    expect(wrapper.find('.cell[data-cell="1"]').attributes('style')).toContain('color-mix')
  })

  it('emits start/move/end using the content box (border excluded)', async () => {
    const wrapper = mountBoard()
    const board = wrapper.find('.links-board')
    await board.trigger('pointerdown', at(50, 50)) // cell 0
    await board.trigger('pointermove', at(104, 50)) // x = 101 → column 1
    await board.trigger('pointermove', at(110, 50)) // same cell – no event
    await board.trigger('pointermove', at(104, 160)) // cell 4
    await board.trigger('pointerup', at(104, 160))
    expect(wrapper.emitted('start')).toEqual([[0]])
    expect(wrapper.emitted('move')).toEqual([[1], [4]])
    expect(wrapper.emitted('end')).toHaveLength(1)
  })

  it('prefers browser hit testing when available', async () => {
    const wrapper = mountBoard()
    const target = wrapper.find('[data-cell="8"]').element
    const original = document.elementFromPoint
    document.elementFromPoint = () => target
    try {
      await wrapper.find('.links-board').trigger('pointerdown', at(5, 5))
      expect(wrapper.emitted('start')).toEqual([[8]])
    } finally {
      document.elementFromPoint = original
    }
  })

  it('shows letters on dots when enabled', async () => {
    const wrapper = mountBoard()
    expect(wrapper.find('.dot__label').exists()).toBe(false)
    await wrapper.setProps({ showLabels: true })
    expect(wrapper.findAll('.dot__label').map((l) => l.text())).toContain('B')
  })
})
