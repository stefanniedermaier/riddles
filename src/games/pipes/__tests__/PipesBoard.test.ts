import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { settings } from '@/core/settings'
import PipesBoard from '../PipesBoard.vue'
import { LEFT, RIGHT } from '../logic/types'

describe('PipesBoard with several sources', () => {
  it('numbers the sources and names the water of each cell', () => {
    settings.value.locale = 'en'
    const wrapper = mount(PipesBoard, {
      props: {
        width: 4,
        height: 1,
        sources: [0, 3],
        solution: [RIGHT, LEFT, RIGHT, LEFT],
        turns: [0, 0, 0, 0],
        locked: new Set<number>(),
        water: [0, 0, -2, 1],
      },
    })
    expect(wrapper.findAll('.tile__number').map((n) => n.text())).toEqual(['1', '2'])
    const labels = wrapper.findAll('[role="gridcell"]').map((c) => c.attributes('aria-label'))
    expect(labels[0]).toContain('source 1')
    expect(labels[1]).toContain('water from source 1')
    expect(labels[2]).toContain('mixed water')
    expect(labels[3]).toContain('source 2')
    expect(wrapper.find('[data-cell="3"] .tile__pipe').classes()).toEqual(
      expect.arrayContaining(['tile__pipe--water', 'tile__pipe--c1', 'tile__pipe--s1']),
    )
    expect(wrapper.find('[data-cell="2"] .tile__flow').exists()).toBe(false)
  })
})
