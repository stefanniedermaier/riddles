import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import CardTable from '@/components/cards/CardTable.vue'
import { solve } from '@/core/cards/solver'
import { settings as appSettings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { load } from '@/core/storage'
import { playProps } from '@/games/routes'
import FreeCellPlay from '../FreeCellPlay.vue'
import { freecell, settings } from '../game'
import { deal, rules } from '../logic/rules'

const Empty = { template: '<div />' }
const SAVE = 'freecell:current:v1'

/** A deal the solver finishes quickly. */
const SEED = (() => {
  for (let seed = 1; ; seed++) if (solve(rules, deal('cells4', seed), 40_000).moves) return seed
})()

async function start() {
  vi.spyOn(freecell, 'deal').mockResolvedValue(SEED)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/freecell', name: 'freecell', component: Empty },
      { path: '/freecell/play', name: 'freecell-play', component: FreeCellPlay },
    ],
  })
  await router.push('/freecell/play?new=cells4')
  const wrapper = mount(FreeCellPlay, { props: playProps(router.currentRoute.value), global: { plugins: [router] }, attachTo: document.body })
  await vi.waitFor(() => expect(wrapper.find('.card-table').exists()).toBe(true))
  await flushPromises()
  const table = () => wrapper.findComponent(CardTable)
  const toolbarButton = (text: string) => wrapper.findAll('.toolbar button').find((b) => b.text() === text)
  return { wrapper, table, toolbarButton }
}

const saved = () => load<{ moves: unknown[]; undos: number } | null>(SAVE, null)

describe('FreeCell play view', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
    appSettings.value.locale = 'en'
    appSettings.value.motion = 'reduced'
    settings.value = { scoring: 'time', solvable: true, tapAuto: true, fourColor: false, autoFoundation: false }
  })
  afterEach(() => {
    document.body.innerHTML = ''
    appSettings.value.motion = 'system'
    vi.restoreAllMocks()
  })

  it('deals 52 cards face up with four free cells, saves after the first move and undoes it', async () => {
    const { wrapper, table } = await start()
    expect(wrapper.findAll('.card')).toHaveLength(52)
    expect(wrapper.text()).toContain('4 / 4')
    expect(saved()).toBeNull()

    // A tap on a column's top card moves it (tap mode) – at worst into a free cell.
    const column = table().props('piles').find((p: { id: string }) => p.id === 't0')!
    table().vm.$emit('tap', 't0', column.slots.length - 1)
    await flushPromises()
    expect(saved()?.moves).toHaveLength(1)
    expect(getVariantStats('freecell', 'cells4').started).toBe(1)

    await wrapper.find('.toolbar button[aria-label="Undo"]').trigger('click')
    expect(saved()).toMatchObject({ moves: [], undos: 1 })
    wrapper.unmount()
  })

  it('wins by following hints', async () => {
    const { wrapper, toolbarButton } = await start()
    for (let i = 0; i < 1000 && !document.body.textContent?.includes('Solved!'); i++) {
      const button = toolbarButton('Apply') ?? toolbarButton('Finish')
      if (button) await button.trigger('click')
      else await wrapper.find('.toolbar button[aria-label="Hint"]').trigger('click')
      await flushPromises()
    }
    await vi.waitFor(() => expect(document.body.textContent).toContain('Solved!'))
    expect(saved()).toBeNull()
    expect(getVariantStats('freecell', 'cells4').finished).toBe(1)
    wrapper.unmount()
  }, 60_000)
})
