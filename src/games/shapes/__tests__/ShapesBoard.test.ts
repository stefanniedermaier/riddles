import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { DisplayPiece } from '../animator'
import { SIZE } from '../logic/types'
import ShapesBoard from '../ShapesBoard.vue'

const pieces: DisplayPiece[] = Array.from({ length: SIZE * SIZE }, (_, cell) => ({
  id: cell,
  kind: cell % 6,
  special: cell === 28 ? 'burst' : 'none',
  row: Math.floor(cell / SIZE),
  col: cell % SIZE,
  clearing: false,
  firing: false,
  durationMs: 0,
  ease: 'move',
  land: 0,
  landDelayMs: 0,
}))

describe('ShapesBoard keyboard', () => {
  it('moves a cursor, reads the piece and swaps with Enter on two neighbours', async () => {
    const wrapper = mount(ShapesBoard, {
      props: {
        pieces,
        effects: [],
        selected: null,
        hint: null,
        locked: false,
        onSelect: (cell: number | null) => wrapper.setProps({ selected: cell }),
      },
    })
    const board = wrapper.find('.board')
    expect(board.attributes('tabindex')).toBe('0')
    // The cursor starts at row 4, column 4 (cell 27).
    await board.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.find('[aria-live]').text()).toBe('Row 4, column 5: flowers, dynamite')
    await board.trigger('keydown', { key: 'Enter' })
    expect(wrapper.props('selected')).toBe(28)
    await board.trigger('keydown', { key: 'ArrowDown' })
    await board.trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('swap')).toEqual([[28, 36]])
  })
})

describe('ShapesBoard touch', () => {
  function setup() {
    const wrapper = mount(ShapesBoard, {
      props: { pieces, effects: [], selected: null, hint: null, locked: false },
    })
    const board = wrapper.find('.board')
    // 400 × 400 px board: 50 px per cell.
    ;(board.element as HTMLElement).getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0 }) as DOMRect
    const pointer = (type: string, pointerId: number, x: number, y: number, isPrimary = pointerId === 1) =>
      board.trigger(type, { pointerId, clientX: x, clientY: y, isPrimary })
    return { wrapper, pointer }
  }

  it('swipes one piece to its neighbour', async () => {
    const { wrapper, pointer } = setup()
    await pointer('pointerdown', 1, 175, 175) // cell 27
    await pointer('pointermove', 1, 205, 178)
    expect(wrapper.emitted('swap')).toEqual([[27, 28]])
  })

  it('a second finger (pinch to zoom) cancels the gesture: no swap, no tap', async () => {
    const { wrapper, pointer } = setup()
    await pointer('pointerdown', 1, 175, 175)
    await pointer('pointerdown', 2, 325, 325)
    await pointer('pointermove', 1, 140, 140)
    await pointer('pointermove', 2, 360, 360)
    await pointer('pointerup', 1, 140, 140)
    await pointer('pointerup', 2, 360, 360)
    expect(wrapper.emitted('swap')).toBeUndefined()
    expect(wrapper.emitted('select')).toBeUndefined()

    // The next touch works again, even if a finger was lifted outside the board.
    await pointer('pointerdown', 1, 175, 175)
    await pointer('pointerdown', 2, 325, 325)
    await pointer('pointerup', 1, 175, 175) // finger 2 is lifted elsewhere
    await pointer('pointerdown', 3, 75, 75, true) // cell 9
    await pointer('pointermove', 3, 75, 110)
    expect(wrapper.emitted('swap')).toEqual([[9, 17]])
  })
})
