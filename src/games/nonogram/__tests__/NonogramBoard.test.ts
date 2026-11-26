import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { cluesFor } from '../logic/lines'
import { CROSSED, FILLED, UNKNOWN, type CellMark } from '../logic/types'
import NonogramBoard from '../NonogramBoard.vue'

const solution = [0, 1, 0, 1, 1, 1, 0, 1, 0]
const clues = cluesFor(solution, 3, 3)

function mountBoard(cells: CellMark[]) {
  const wrapper = mount(NonogramBoard, {
    props: {
      width: 3,
      height: 3,
      ...clues,
      cells,
      rowsDone: [true, false, false],
      colsDone: [false, false, false],
      wrong: new Set([2]),
    },
  })
  const el = wrapper.find('.board').element as HTMLElement
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 306, height: 306, right: 306, bottom: 306, x: 0, y: 0 }) as DOMRect
  return wrapper
}

describe('NonogramBoard', () => {
  it('renders cells, clues, marks and mistakes', () => {
    const cells = new Array<CellMark>(9).fill(UNKNOWN)
    cells[1] = FILLED
    cells[2] = CROSSED
    const wrapper = mountBoard(cells)
    expect(wrapper.findAll('.cell')).toHaveLength(9)
    expect(wrapper.findAll('.row-clue').map((c) => c.text())).toEqual(['1', '3', '1'])
    expect(wrapper.findAll('.row-clue')[0]!.classes()).toContain('clue--done')
    expect(wrapper.find('[data-cell="1"]').classes()).toContain('cell--filled')
    expect(wrapper.find('[data-cell="2"]').find('.cell__cross').exists()).toBe(true)
    expect(wrapper.find('[data-cell="2"]').classes()).toContain('cell--wrong')
  })

  it('a second finger (pinch to zoom) ends the stroke and starts no new one', async () => {
    const wrapper = mountBoard(new Array<CellMark>(9).fill(UNKNOWN))
    const board = wrapper.find('.board')
    await board.trigger('pointerdown', { clientX: 50, clientY: 50, pointerId: 1, isPrimary: true }) // cell 0
    await board.trigger('pointerdown', { clientX: 250, clientY: 250, pointerId: 2, isPrimary: false })
    await board.trigger('pointermove', { clientX: 150, clientY: 50, pointerId: 1, isPrimary: true })
    await board.trigger('pointermove', { clientX: 250, clientY: 150, pointerId: 2, isPrimary: false })
    expect(wrapper.emitted('start')).toEqual([[0]])
    expect(wrapper.emitted('move')).toBeUndefined()
    expect(wrapper.emitted('end')).toHaveLength(1)
  })

  it('uses hit testing and falls back to geometry without the border', async () => {
    const wrapper = mountBoard(new Array<CellMark>(9).fill(UNKNOWN))
    const board = wrapper.find('.board')
    const target = wrapper.find('[data-cell="7"]').element
    const original = document.elementFromPoint
    document.elementFromPoint = () => target
    await board.trigger('pointerdown', { clientX: 1, clientY: 1, pointerId: 1 })
    await board.trigger('pointerup', { clientX: 1, clientY: 1, pointerId: 1 })
    document.elementFromPoint = original
    expect(wrapper.emitted('start')).toEqual([[7]])

    // Fallback: 306 px including a 3 px border → 100 px cells.
    const el = board.element as HTMLElement
    Object.defineProperty(el, 'clientLeft', { value: 3 })
    Object.defineProperty(el, 'clientTop', { value: 3 })
    Object.defineProperty(el, 'clientWidth', { value: 300 })
    Object.defineProperty(el, 'clientHeight', { value: 300 })
    await board.trigger('pointerdown', { clientX: 105, clientY: 205, pointerId: 2 })
    await board.trigger('pointermove', { clientX: 250, clientY: 205, pointerId: 2 })
    await board.trigger('pointerup', { clientX: 250, clientY: 205, pointerId: 2 })
    expect(wrapper.emitted('start')![1]).toEqual([7])
    expect(wrapper.emitted('move')).toEqual([[8]])
    expect(wrapper.emitted('end')).toHaveLength(2)
  })
})
