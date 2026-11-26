import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import CardTable from '@/components/cards/CardTable.vue'
import type { PileView } from '@/components/cards/types'
import { settings as appSettings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { load } from '@/core/storage'
import { playProps } from '@/games/routes'
import { spider } from '../game'
import SpiderPlay from '../SpiderPlay.vue'

const Empty = { template: '<div />' }
const SAVE = 'spider:current:v1'

async function start() {
  vi.spyOn(spider, 'deal').mockResolvedValue(7)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/spider', name: 'spider', component: Empty },
      { path: '/spider/play', name: 'spider-play', component: SpiderPlay },
    ],
  })
  await router.push('/spider/play?new=suits1')
  const wrapper = mount(SpiderPlay, { props: playProps(router.currentRoute.value), global: { plugins: [router] }, attachTo: document.body })
  await vi.waitFor(() => expect(wrapper.find('.card-table').exists()).toBe(true))
  await flushPromises()
  return { wrapper, router, table: () => wrapper.findComponent(CardTable) }
}

const saved = () => load<{ moves: unknown[]; undos: number } | null>(SAVE, null)
type Table = Awaited<ReturnType<typeof start>>['table']
const piles = (table: Table): readonly PileView[] => table().props('piles')
const pile = (table: Table, id: string): PileView => piles(table).find((p) => p.id === id)!

describe('Spider play view', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
    appSettings.value.locale = 'en'
    appSettings.value.motion = 'reduced'
    spider.settings.value = { scoring: 'time', solvable: true, tapAuto: true, fourColor: false, autoFoundation: false }
  })
  afterEach(() => {
    document.body.innerHTML = ''
    appSettings.value.motion = 'system'
    vi.restoreAllMocks()
  })

  it('deals 54 cards to ten columns and keeps 50 in the stock', async () => {
    const { wrapper, table } = await start()
    const columns = piles(table).filter((p) => p.id[0] === 't')
    expect(columns).toHaveLength(10)
    expect(columns.reduce((sum, p) => sum + p.slots.length, 0)).toBe(54)
    expect(wrapper.text()).toContain('0 / 8')
    expect(pile(table, 's').label).toBe('Stock: 5 deals left')
    wrapper.unmount()
  })

  it('a tap on the stock deals a row, is saved and can be undone', async () => {
    const { wrapper, table } = await start()
    expect(saved()).toBeNull()
    table().vm.$emit('tap', 's', 0)
    await flushPromises()
    expect(saved()?.moves).toEqual([{ k: 'deal' }])
    expect(getVariantStats('spider', 'suits1').started).toBe(1)
    expect(pile(table, 's').label).toBe('Stock: 4 deals left')
    expect(pile(table, 't0').slots).toHaveLength(7)

    await wrapper.find('.toolbar button[aria-label="Undo"]').trigger('click')
    expect(saved()).toMatchObject({ moves: [], undos: 1 })
    expect(pile(table, 's').label).toBe('Stock: 5 deals left')
    wrapper.unmount()
  })

  it('shows a hint for the current position', async () => {
    const { wrapper } = await start()
    await wrapper.find('.toolbar button[aria-label="Hint"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.findAll('.toolbar button').some((b) => b.text() === 'Apply')).toBe(true))
    wrapper.unmount()
  })
})
