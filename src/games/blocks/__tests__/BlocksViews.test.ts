import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { RouterView, createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { SAVE_KEY } from '../index'
import { CELLS, SIZE, type BlocksRun } from '../logic/engine'
import { SHAPES } from '../logic/pieces'
import { routes } from '../routes'
import { loadRun, saveRun } from '../store'

const Host = defineComponent({ render: () => h(RouterView) })

const shapeIndex = (cells: [number, number][]) =>
  SHAPES.findIndex((s) => JSON.stringify(s.cells) === JSON.stringify(cells))
const MONO = shapeIndex([[0, 0]])
const I4H = shapeIndex([[0, 0], [0, 1], [0, 2], [0, 3]])

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', name: 'home', component: { render: () => null } }, ...routes],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(Host, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router }
}

const key = (wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper'], name: string) =>
  wrapper.find('.blocks-board').trigger('keydown', { key: name })

describe('Blocks views', () => {
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

  it('starts a new game from the lobby and saves after the first piece', async () => {
    const { wrapper, router } = await mountAt('/blocks')
    expect(wrapper.text()).toContain('How to play')
    await wrapper.findAll('.choice').find((c) => c.text().includes('New game'))!.trigger('click')
    await vi.waitFor(() => expect(wrapper.findAll('.tray__piece')).toHaveLength(3))
    expect(router.currentRoute.value.name).toBe('blocks-play')
    expect(router.currentRoute.value.query.new).toBeUndefined()
    expect(loadRun()).toBeNull() // nothing saved before the first move

    // Keyboard: choose piece 1 and place it at the top-left corner.
    await key(wrapper, '1')
    await key(wrapper, 'Enter')
    await flushPromises()
    const saved = loadRun()
    expect(saved?.moves).toBe(1)
    expect(saved!.score).toBeGreaterThan(0)
    expect(wrapper.find('[data-score]').text()).toBe(String(saved!.score))
    expect(getVariantStats('blocks', 'classic').started).toBe(1)
    wrapper.unmount()
  })

  it('ends the game when no piece fits and records the score', async () => {
    // Checkerboard: only the single block fits; afterwards the 4-bar has no room.
    const board = Array.from({ length: CELLS }, (_, cell) =>
      (Math.floor(cell / SIZE) + (cell % SIZE)) % 2 === 0 ? 1 : 0,
    )
    const run: BlocksRun = {
      board,
      tray: [{ shape: MONO, color: 2 }, { shape: I4H, color: 3 }, null],
      score: 50,
      combo: 0,
      moves: 10,
      lines: 2,
      rngState: 1,
      over: false,
    }
    saveRun(run)
    const { wrapper } = await mountAt('/blocks/play')
    await vi.waitFor(() => expect(wrapper.findAll('.tray__piece')).toHaveLength(2))
    expect(wrapper.findAll('.tray__piece--blocked')).toHaveLength(1)

    await key(wrapper, '1')
    await key(wrapper, 'ArrowRight') // cell 1 is free
    await key(wrapper, 'Enter')
    await flushPromises()
    await new Promise((resolve) => setTimeout(resolve, 10))
    await flushPromises()

    expect(document.body.textContent).toContain('No more space')
    expect(localStorage.getItem(`riddles:${SAVE_KEY}`)).toBeNull()
    expect(getVariantStats('blocks', 'classic').bestScore).toBe(51)
    wrapper.unmount()
  })

  it('sends players without a saved game back to the lobby', async () => {
    const { router } = await mountAt('/blocks/play')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('blocks')
  })
})
