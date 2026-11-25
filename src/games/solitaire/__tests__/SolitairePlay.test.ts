import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import CardTable from '@/components/cards/CardTable.vue'
import { solve } from '@/core/cards/solver'
import { settings as appSettings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { load } from '@/core/storage'
import { solitaire, settings } from '../game'
import { deal, rules } from '../logic/rules'
import SolitairePlay from '../SolitairePlay.vue'

const Empty = { template: '<div />' }
const SAVE = 'solitaire:current:v1'

/** A deal the solver can finish quickly. */
const SEED = (() => {
  for (let seed = 1; ; seed++) if (solve(rules, deal('draw1', seed), 40_000).moves) return seed
})()

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/solitaire', name: 'solitaire', component: Empty },
      { path: '/solitaire/play', name: 'solitaire-play', component: SolitairePlay },
    ],
  })
}

async function start() {
  vi.spyOn(solitaire, 'deal').mockResolvedValue(SEED)
  const router = makeRouter()
  await router.push('/solitaire/play?new=draw1')
  const wrapper = mount(SolitairePlay, { global: { plugins: [router] }, attachTo: document.body })
  await vi.waitFor(() => expect(wrapper.find('.card-table').exists()).toBe(true))
  await flushPromises()
  const table = () => wrapper.findComponent(CardTable)
  const tap = async (pile: string, index = 0) => {
    table().vm.$emit('tap', pile, index)
    await flushPromises()
  }
  const button = (label: string) => wrapper.find(`.toolbar button[aria-label="${label}"]`)
  return { wrapper, router, table, tap, button }
}

const saved = () => load<{ moves: unknown[]; undos: number } | null>(SAVE, null)

describe('Solitaire play view (shared card view)', () => {
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

  it('deals, draws from the stock, saves after the first move and undoes it', async () => {
    const { wrapper, tap, button } = await start()
    expect(wrapper.findAll('.card')).toHaveLength(52)
    expect(saved()).toBeNull()
    await tap('s')
    expect(saved()?.moves).toEqual([{ k: 'draw' }])
    expect(getVariantStats('solitaire', 'draw1').started).toBe(1)
    await button('Undo').trigger('click')
    expect(saved()).toMatchObject({ moves: [], undos: 1 })
    wrapper.unmount()
  })

  it('select mode: tap a card, then the target; illegal targets are refused', async () => {
    settings.value = { ...settings.value, tapAuto: false }
    const { wrapper, table, tap } = await start()
    await tap('t6', 6)
    expect(table().props('selected')).toEqual({ pile: 't6', index: 6 })
    await tap('t6', 6)
    expect(table().props('selected')).toBeNull()
    wrapper.unmount()
  })

  it('wins by following hints, in points mode with a score', async () => {
    settings.value = { ...settings.value, scoring: 'points' }
    const { wrapper } = await start()
    for (let i = 0; i < 400 && !document.body.textContent?.includes('Solved!'); i++) {
      const apply = wrapper.findAll('.toolbar button').find((b) => b.text() === 'Apply')
      if (apply) await apply.trigger('click')
      else {
        const finish = wrapper.findAll('.toolbar button').find((b) => b.text() === 'Finish')
        if (finish) await finish.trigger('click')
        else await wrapper.find('.toolbar button[aria-label="Hint"]').trigger('click')
      }
      await flushPromises()
    }
    await vi.waitFor(() => expect(document.body.textContent).toContain('Solved!'))
    expect(document.body.textContent).toContain('Win bonus')
    expect(saved()).toBeNull()
    const stats = getVariantStats('solitaire', 'draw1')
    expect(stats.finished).toBe(1)
    expect(stats.bestScore).toBeGreaterThan(0)
    wrapper.unmount()
  }, 60_000)

  it('redirects to the lobby without a saved game', async () => {
    const router = makeRouter()
    await router.push('/solitaire/play')
    mount(SolitairePlay, { global: { plugins: [router] } })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('solitaire')
  })
})
