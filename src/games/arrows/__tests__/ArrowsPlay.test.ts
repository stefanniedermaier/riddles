import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { load } from '@/core/storage'
import ArrowsBoard from '../ArrowsBoard.vue'
import ArrowsPlay from '../ArrowsPlay.vue'
import { SAVE_KEY } from '../index'
import { chainPuzzle } from '../logic/__tests__/helpers'
import { generatePuzzle } from '../logic/generator'
import { isArrowsSave, type ArrowsPuzzle } from '../logic/types'
import { arrowsPool } from '../pool'

const Empty = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/arrows', name: 'arrows', component: Empty },
      { path: '/arrows/play', name: 'arrows-play', component: ArrowsPlay },
    ],
  })
}

const saved = () => load(SAVE_KEY, null, (raw) => (isArrowsSave(raw) ? raw : undefined))

async function start(puzzle: ArrowsPuzzle) {
  vi.spyOn(arrowsPool, 'take').mockResolvedValue(puzzle)
  const router = makeRouter()
  await router.push('/arrows/play?new=easy')
  const wrapper = mount(ArrowsPlay, { global: { plugins: [router] }, attachTo: document.body })
  await vi.waitFor(() => expect(wrapper.find('.arrows-board').exists()).toBe(true))
  const tap = async (cell: number) => {
    wrapper.findComponent(ArrowsBoard).vm.$emit('tap', cell)
    await flushPromises()
  }
  return { wrapper, router, tap }
}

describe('ArrowsPlay', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
    settings.value.locale = 'en'
    settings.value.motion = 'reduced'
  })
  afterEach(() => {
    document.body.innerHTML = ''
    settings.value.motion = 'system'
    vi.restoreAllMocks()
  })

  it('saves nothing before the first tap, then removes a free arrow', async () => {
    const { wrapper, router, tap } = await start(chainPuzzle())
    expect(router.currentRoute.value.query.new).toBeUndefined()
    expect(saved()).toBeNull()
    expect(getVariantStats('arrows', 'easy').started).toBe(0)

    await tap(8) // C can leave
    expect(saved()).toMatchObject({ removed: [2], lives: 3, actions: 1 })
    expect(getVariantStats('arrows', 'easy').started).toBe(1)
    expect(wrapper.text()).toContain('2') // arrows left
    wrapper.unmount()
  })

  it('a blocked tap costs a heart and shows what blocks it', async () => {
    const { wrapper, tap } = await start(chainPuzzle())
    await tap(0) // A is blocked by B
    expect(saved()?.lives).toBe(2)
    expect(wrapper.findAll('.heart--lost')).toHaveLength(1)
    expect(wrapper.find('[data-arrow="0"]').classes()).toContain('arrow--bump')
    expect(wrapper.find('[data-arrow="1"]').classes()).toContain('arrow--blocker')
    wrapper.unmount()
  })

  it('fails after three blocked taps and can try the same puzzle again', async () => {
    const { wrapper, tap } = await start(chainPuzzle())
    for (let i = 0; i < 3; i++) await tap(1)
    await vi.waitFor(() => expect(document.body.textContent).toContain('Out of hearts'))
    expect(saved()).toBeNull()
    expect(getVariantStats('arrows', 'easy')).toMatchObject({ started: 1, finished: 0 })

    const retry = [...document.querySelectorAll<HTMLButtonElement>('.dialog .app-btn')].find((b) =>
      b.textContent?.includes('Try again'),
    )!
    retry.click()
    await flushPromises()
    expect(wrapper.findAll('.heart--lost')).toHaveLength(0)
    expect(wrapper.findAll('[data-arrow]')).toHaveLength(3)
    wrapper.unmount()
  })

  it('can be solved with hints and records the time', async () => {
    const puzzle = generatePuzzle('easy', 11)
    const { wrapper, tap } = await start(puzzle)
    for (let i = 0; i < puzzle.arrows.length; i++) {
      const hint = wrapper.findAll('.toolbar button').find((b) => b.text() === 'Hint')!
      await hint.trigger('click')
      const id = Number(wrapper.find('.arrow--hint').attributes('data-arrow'))
      await tap(puzzle.arrows[id]!.cells[0]!)
    }
    await vi.waitFor(() => expect(document.body.textContent).toContain('Solved!'))
    expect(document.body.textContent).toContain('Arrows menu')
    expect(saved()).toBeNull()
    expect(getVariantStats('arrows', 'easy')).toMatchObject({ started: 1, finished: 1 })
    wrapper.unmount()
  })

  it('redirects to the lobby without a saved game', async () => {
    const router = makeRouter()
    await router.push('/arrows/play')
    mount(ArrowsPlay, { global: { plugins: [router] } })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('arrows')
  })
})
