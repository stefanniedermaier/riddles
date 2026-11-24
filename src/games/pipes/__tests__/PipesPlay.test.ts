import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { load } from '@/core/storage'
import PipesBoard from '../PipesBoard.vue'
import PipesPlay from '../PipesPlay.vue'
import { SAVE_KEY } from '../index'
import { isPipesSave } from '../logic/types'

const Empty = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/pipes', name: 'pipes', component: Empty },
      { path: '/pipes/play', name: 'pipes-play', component: PipesPlay },
    ],
  })
}

const saved = () => load(SAVE_KEY, null, (raw) => (isPipesSave(raw) ? raw : undefined))

async function start() {
  const router = makeRouter()
  await router.push('/pipes/play?new=easy')
  const wrapper = mount(PipesPlay, { global: { plugins: [router] }, attachTo: document.body })
  await vi.waitFor(() => expect(wrapper.find('.pipes-board').exists()).toBe(true))
  await flushPromises()
  const emit = async (event: 'rotate' | 'lock', cell: number) => {
    wrapper.findComponent(PipesBoard).vm.$emit(event, cell)
    await flushPromises()
  }
  const button = (text: string) => wrapper.findAll('.toolbar button').find((b) => b.text() === text)!
  return { wrapper, router, emit, button }
}

describe('PipesPlay', () => {
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

  it('rotates a tile, saves after the first move and undoes it', async () => {
    const { wrapper, router, emit, button } = await start()
    expect(router.currentRoute.value.query.new).toBeUndefined()
    expect(saved()).toBeNull()
    const before = wrapper.findComponent(PipesBoard).props('turns')[0]!
    await emit('rotate', 0)
    expect(saved()?.turns[0]).toBe((before + 1) % 4)
    expect(saved()?.moves).toBe(1)
    expect(getVariantStats('pipes', 'easy').started).toBe(1)
    await button('Undo').trigger('click')
    expect(saved()?.turns[0]).toBe(before)
    wrapper.unmount()
  })

  it('locked tiles do not rotate', async () => {
    const { wrapper, emit } = await start()
    await emit('lock', 3)
    const turns = saved()!.turns[3]
    await emit('rotate', 3)
    expect(saved()?.turns[3]).toBe(turns)
    expect(wrapper.find('[data-cell="3"]').classes()).toContain('cell--locked')
    wrapper.unmount()
  })

  it('can be solved with hints and records the time', async () => {
    const { wrapper, button } = await start()
    for (let i = 0; i < 30 && !document.body.textContent?.includes('Solved!'); i++) {
      if (!wrapper.find('.pipes-board--solved').exists()) await button('Hint').trigger('click')
      await flushPromises()
    }
    await vi.waitFor(() => expect(document.body.textContent).toContain('Solved!'))
    expect(saved()).toBeNull()
    expect(getVariantStats('pipes', 'easy')).toMatchObject({ started: 1, finished: 1 })
    wrapper.unmount()
  })

  it('redirects to the lobby without a saved game', async () => {
    const router = makeRouter()
    await router.push('/pipes/play')
    mount(PipesPlay, { global: { plugins: [router] } })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('pipes')
  })
})
