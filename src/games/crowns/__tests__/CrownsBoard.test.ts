import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import CrownsBoard from '../CrownsBoard.vue'
import type { CellState } from '../logic/types'

// prettier-ignore
const regions = [
  0, 0, 1, 1,
  0, 2, 2, 1,
  3, 2, 2, 1,
  3, 3, 3, 1,
]

function mountBoard(cells: CellState[]) {
  const wrapper = mount(CrownsBoard, { props: { size: 4, regions, cells } })
  const el = wrapper.find('.crowns-board').element as HTMLElement
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0 }) as DOMRect
  return wrapper
}

const at = (col: number, row: number) => ({ clientX: col * 100 + 50, clientY: row * 100 + 50, pointerId: 1 })

describe('CrownsBoard', () => {
  it('renders one cell per field with region borders', () => {
    const wrapper = mountBoard(new Array<CellState>(16).fill(0))
    const cells = wrapper.findAll('.cell')
    expect(cells).toHaveLength(16)
    // Cell 1 (region 0) borders cell 2 (region 1) on the right with a thick line.
    expect((cells[1]!.element as HTMLElement).style.borderRightWidth).toBe('1.5px')
    expect((cells[0]!.element as HTMLElement).style.borderRightWidth).toBe('0.5px')
  })

  it('emits a tap when the pointer does not leave the cell', async () => {
    const wrapper = mountBoard(new Array<CellState>(16).fill(0))
    const board = wrapper.find('.crowns-board')
    await board.trigger('pointerdown', at(2, 1))
    await board.trigger('pointerup', at(2, 1))
    expect(wrapper.emitted('tap')).toEqual([[6]])
    expect(wrapper.emitted('paint')).toBeUndefined()
  })

  it('paints marks while dragging from an empty cell and skips crowns', async () => {
    const cells = new Array<CellState>(16).fill(0)
    cells[2] = 2
    const wrapper = mountBoard(cells)
    const board = wrapper.find('.crowns-board')
    await board.trigger('pointerdown', at(0, 0))
    await board.trigger('pointermove', at(1, 0))
    await board.trigger('pointermove', at(2, 0))
    await board.trigger('pointermove', at(3, 0))
    await board.trigger('pointerup', at(3, 0))
    expect(wrapper.emitted('paint')).toEqual([
      [0, 1],
      [1, 1],
      [3, 1],
    ])
    expect(wrapper.emitted('strokeEnd')).toHaveLength(1)
    expect(wrapper.emitted('tap')).toBeUndefined()
  })

  it('erases marks while dragging from a marked cell', async () => {
    const cells = new Array<CellState>(16).fill(0)
    cells[0] = 1
    cells[4] = 1
    const wrapper = mountBoard(cells)
    const board = wrapper.find('.crowns-board')
    await board.trigger('pointerdown', at(0, 0))
    await board.trigger('pointermove', at(0, 1))
    await board.trigger('pointermove', at(0, 2))
    await board.trigger('pointerup', at(0, 2))
    expect(wrapper.emitted('paint')).toEqual([
      [0, 0],
      [4, 0],
    ])
  })
})
