import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { load } from '@/core/storage'
import WaterSortBoard from '../WaterSortBoard.vue'
import WaterSortPlay from '../WaterSortPlay.vue'
import { SAVE_KEY } from '../index'
import { pourAmount } from '../logic/rules'
import { isWaterSortSave } from '../logic/types'

const Empty = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/watersort', name: 'watersort', component: Empty },
      { path: '/watersort/play', name: 'watersort-play', component: WaterSortPlay },
    ],
  })
}

const saved = () => load(SAVE_KEY, null, (raw) => (isWaterSortSave(raw) ? raw : undefined))

async function start() {
  const router = makeRouter()
  await router.push('/watersort/play?new=easy')
  const wrapper = mount(WaterSortPlay, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  const tap = async (tube: number) => {
    await wrapper.find(`[data-tube="${tube}"]`).trigger('click')
    await flushPromises()
  }
  const button = (text: string) => wrapper.findAll('.toolbar button').find((b) => b.text() === text)!
  return { wrapper, router, tap, button }
}

describe('WaterSortPlay', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
    settings.value.locale = 'en'
    settings.value.motion = 'reduced'
  })
  afterEach(() => {
    document.body.innerHTML = ''
    settings.value.motion = 'system'
  })

  it('picks up a tube, pours into an empty tube, saves and undoes', async () => {
    const { wrapper, router, tap, button } = await start()
    expect(router.currentRoute.value.query.new).toBeUndefined()
    expect(wrapper.findAll('.tube')).toHaveLength(6)
    expect(saved()).toBeNull()
    await tap(0)
    expect(wrapper.find('[data-tube="0"]').classes()).toContain('tube--selected')
    await tap(4) // first empty tube
    const after = saved()!
    expect(after.tubes[4]!.length).toBeGreaterThan(0)
    expect(after.moves).toBe(1)
    expect(getVariantStats('watersort', 'easy').started).toBe(1)
    await button('Undo').trigger('click')
    expect(saved()?.tubes[4]).toEqual([])
    // Ctrl/⌘+Z undoes as well.
    await tap(0)
    await tap(4)
    expect(saved()!.tubes[4]!.length).toBeGreaterThan(0)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Z', metaKey: true }))
    await flushPromises()
    expect(saved()?.tubes[4]).toEqual([])
    wrapper.unmount()
  })

  it('refuses a pour onto another colour', async () => {
    const { wrapper, tap } = await start()
    const tubes = wrapper.findComponent(WaterSortBoard).props('tubes')
    const from = 0
    const to = tubes.findIndex((tube, i) => i !== from && tube.length === 4 && pourAmount(tubes, { from, to: i }) === 0)
    expect(to).toBeGreaterThan(0)
    await tap(from)
    await tap(to)
    expect(saved()).toBeNull() // nothing happened (the full tube got picked up instead or refused)
    wrapper.unmount()
  })

  it('can be solved with hints and records the time', async () => {
    const { wrapper, button } = await start()
    for (let i = 0; i < 400 && !document.body.textContent?.includes('Solved!'); i++) {
      if (wrapper.find('.toolbar button[aria-label="Close"]').exists()) await button('Apply').trigger('click')
      else await button('Hint').trigger('click')
      await flushPromises()
    }
    await vi.waitFor(() => expect(document.body.textContent).toContain('Solved!'))
    expect(saved()).toBeNull()
    expect(getVariantStats('watersort', 'easy')).toMatchObject({ started: 1, finished: 1 })
    wrapper.unmount()
  })
})
