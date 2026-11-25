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
    expect(wrapper.find('[aria-live]').text()).toBe('Row 4, column 5: flowers, bomb')
    await board.trigger('keydown', { key: 'Enter' })
    expect(wrapper.props('selected')).toBe(28)
    await board.trigger('keydown', { key: 'ArrowDown' })
    await board.trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('swap')).toEqual([[28, 36]])
  })
})
