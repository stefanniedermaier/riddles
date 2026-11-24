import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'

import { settings } from '@/core/settings'
import { gameLayout, normalizeLayout, visibleGames } from '@/games/layout'
import GameOrderList from '../GameOrderList.vue'

const names = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('.order__name').map((el) => el.text())

describe('GameOrderList', () => {
  beforeEach(() => {
    settings.value.locale = 'en'
    gameLayout.value = normalizeLayout(null)
  })

  it('lists all games in the stored order', () => {
    gameLayout.value = normalizeLayout({ order: ['shapes', 'sudoku'] })
    const wrapper = mount(GameOrderList)
    expect(names(wrapper)).toEqual(['Shapes', 'Sudoku', 'Stars', 'Links', 'Nonogram', 'Arrows', 'Merge', 'Blocks', 'Mines'])
  })

  it('moves a game with the arrow keys on its handle and announces it', async () => {
    const wrapper = mount(GameOrderList, { attachTo: document.body })
    await wrapper.findAll('.order__handle')[0]!.trigger('keydown', { key: 'ArrowDown' })
    await flushPromises()
    expect(names(wrapper).slice(0, 2)).toEqual(['Stars', 'Sudoku'])
    expect(wrapper.text()).toContain('Sudoku moved to position 2.')
    await wrapper.findAll('.order__handle')[1]!.trigger('keydown', { key: 'ArrowUp' })
    expect(names(wrapper).slice(0, 2)).toEqual(['Sudoku', 'Stars'])
    wrapper.unmount()
  })

  it('reorders by dragging the handle', async () => {
    const wrapper = mount(GameOrderList, { attachTo: document.body })
    const list = wrapper.find('.order__list').element as HTMLElement
    list.getBoundingClientRect = () => ({ top: 0, height: 60 * names(wrapper).length }) as DOMRect
    for (const row of wrapper.findAll('.order__row')) {
      const index = Number(names(wrapper).indexOf(row.find('.order__name').text()))
      ;(row.element as HTMLElement).getBoundingClientRect = () => ({ top: index * 60 }) as DOMRect
    }
    const handle = wrapper.findAll('.order__handle')[0]!
    await handle.trigger('pointerdown', { pointerId: 1, clientY: 30, button: 0 })
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientY: 160 })) // near slot 2
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientY: 160 }))
    await flushPromises()
    expect(names(wrapper)).toEqual(['Stars', 'Links', 'Sudoku', 'Nonogram', 'Arrows', 'Shapes', 'Merge', 'Blocks', 'Mines'])
    wrapper.unmount()
  })

  it('hides games via the switch but never the last enabled one', async () => {
    const wrapper = mount(GameOrderList)
    const switches = () => wrapper.findAll('input[role="switch"]')
    for (const input of switches().slice(1)) await input.setValue(false)
    expect(visibleGames.value.map((game) => game.id)).toEqual(['sudoku'])
    expect(switches()[0]!.attributes('disabled')).toBeDefined()
    await switches()[2]!.setValue(true)
    expect(visibleGames.value.map((game) => game.id)).toEqual(['sudoku', 'links'])
  })
})
