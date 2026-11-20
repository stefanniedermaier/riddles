import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { RouterView, createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { listMoves } from '../logic/board'
import { routes } from '../routes'
import ShapesBoard from '../ShapesBoard.vue'
import { levelProgress, loadRun } from '../store'

const Host = defineComponent({ render: () => h(RouterView) })

async function mountAt(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { render: () => null } }, ...routes],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(Host, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router }
}

describe('Shapes views', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    localStorage.clear()
    settings.value.locale = 'en'
    settings.value.motion = 'reduced'
    levelProgress.value = { unlocked: 1, stars: {} }
  })

  it('lobby lists the three modes', async () => {
    const { wrapper } = await mountAt('/shapes')
    expect(wrapper.text()).toContain('Zen')
    expect(wrapper.text()).toContain('Time')
    expect(wrapper.text()).toContain('Levels')
    wrapper.unmount()
  })

  it('level select shows unlocked and locked levels', async () => {
    const { wrapper } = await mountAt('/shapes/levels')
    const buttons = wrapper.findAll('.level')
    expect(buttons).toHaveLength(20)
    expect(buttons[0]!.attributes('disabled')).toBeUndefined()
    expect(buttons[1]!.attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('starts a zen run, plays a move and saves it', async () => {
    const { wrapper, router } = await mountAt('/shapes/play/zen?new=1')
    expect(wrapper.findAll('.piece')).toHaveLength(64)
    expect(router.currentRoute.value.query.new).toBeUndefined()

    const saved = loadRun('zen')!
    expect(saved.movesMade).toBe(0)
    const move = listMoves(saved.board)[0]!
    wrapper.findComponent(ShapesBoard).vm.$emit('swap', move.a, move.b)
    await flushPromises()

    const after = loadRun('zen')!
    expect(after.movesMade).toBe(1)
    expect(after.score).toBeGreaterThan(0)
    expect(wrapper.findAll('.piece')).toHaveLength(64)
    expect(wrapper.text()).toContain(new Intl.NumberFormat('en').format(after.score))
    wrapper.unmount()
  })

  it('animates a move to the final board when motion is on', async () => {
    settings.value.motion = 'full'
    vi.useFakeTimers()
    const { wrapper } = await mountAt('/shapes/play/zen?new=1')
    const move = listMoves(loadRun('zen')!.board)[0]!
    wrapper.findComponent(ShapesBoard).vm.$emit('swap', move.a, move.b)
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    const after = loadRun('zen')!
    expect(after.movesMade).toBe(1)
    const pieces = wrapper.findAll('.piece')
    expect(pieces).toHaveLength(64)
    expect(wrapper.findAll('.piece--clearing')).toHaveLength(0)
    // Every displayed piece sits on a distinct cell of the board.
    const cells = new Set(
      pieces.map((el) => {
        const [, x, y] = /translate3d\((\d+)%, (\d+)%/.exec(el.attributes('style') ?? '') ?? []
        return Number(y) / 100 * 8 + Number(x) / 100
      }),
    )
    expect(cells.size).toBe(64)
    wrapper.unmount()
  })

  it('shows goals in levels mode', async () => {
    const { wrapper } = await mountAt('/shapes/play/levels?new=1&level=1')
    expect(wrapper.text()).toContain('Level 1')
    expect(wrapper.find('.goals').exists()).toBe(true)
    expect(wrapper.text()).toContain('Moves')
    wrapper.unmount()
  })

  it('redirects to the lobby when there is nothing to resume', async () => {
    const { wrapper, router } = await mountAt('/shapes/play/time')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('shapes')
    wrapper.unmount()
  })
})
