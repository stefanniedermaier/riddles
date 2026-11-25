import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import CardTable from '@/components/cards/CardTable.vue'
import { solve } from '@/core/cards/solver'
import { settings as appSettings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { tripeaks, settings } from '../game'
import { deal, rules } from '../logic/rules'
import TriPeaksPlay from '../TriPeaksPlay.vue'

const Empty = { template: '<div />' }

/** A Hard deal without a solution: drawing every card loses. */
const SEED = (() => {
  for (let seed = 1; ; seed++) {
    const result = solve(rules, deal('hard', seed), 60_000)
    if (!result.moves && !result.exhausted) return seed
  }
})()

describe('TriPeaks play view', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
    appSettings.value.locale = 'en'
    appSettings.value.motion = 'reduced'
    settings.value = { scoring: 'time', solvable: false, tapAuto: true, fourColor: false, autoFoundation: false }
  })
  afterEach(() => {
    document.body.innerHTML = ''
    appSettings.value.motion = 'system'
    vi.restoreAllMocks()
  })

  it('ends the game when the stock is empty and no card fits; undo continues', async () => {
    vi.spyOn(tripeaks, 'deal').mockResolvedValue(SEED)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', name: 'home', component: Empty },
        { path: '/tripeaks', name: 'tripeaks', component: Empty },
        { path: '/tripeaks/play', name: 'tripeaks-play', component: TriPeaksPlay },
      ],
    })
    await router.push('/tripeaks/play?new=hard')
    const wrapper = mount(TriPeaksPlay, { global: { plugins: [router] }, attachTo: document.body })
    await vi.waitFor(() => expect(wrapper.find('.card-table').exists()).toBe(true))
    const table = wrapper.findComponent(CardTable)
    // Play every card that fits, otherwise draw – until the game is lost.
    for (let i = 0; i < 80 && !document.body.textContent?.includes('No moves left'); i++) {
      for (const pile of table.props('piles').filter((p) => p.id[0] === 'p')) {
        table.vm.$emit('tap', pile.id, 0)
        await flushPromises()
      }
      table.vm.$emit('tap', 's', 0)
      await flushPromises()
    }
    await vi.waitFor(() => expect(document.body.textContent).toContain('No moves left'))
    expect(getVariantStats('tripeaks', 'hard')).toMatchObject({ started: 1, finished: 0 })
    const undo = [...document.querySelectorAll<HTMLButtonElement>('.dialog .app-btn')].find((b) => b.textContent?.includes('Undo'))!
    undo.click()
    await flushPromises()
    expect(wrapper.find('.card-table').exists()).toBe(true)
    wrapper.unmount()
  })
})
