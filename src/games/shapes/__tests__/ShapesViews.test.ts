import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { RouterView, createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { listMoves } from '../logic/board'
import { routes } from '../routes'
import ShapesBoard from '../ShapesBoard.vue'
import { levelProgress, loadRun } from '../store'

const Host = defineComponent({ render: () => h(RouterView) })

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

/** Tries neighbouring swaps until one is valid (invalid swaps don't count as moves). */
async function playAnyMove(wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper'], mode: 'zen' | 'time' | 'levels') {
  const before = loadRun(mode)?.movesMade ?? 0
  for (let cell = 0; cell < 64; cell++) {
    for (const other of [cell + 1, cell + 8]) {
      if (other >= 64 || (other === cell + 1 && cell % 8 === 7)) continue
      wrapper.findComponent(ShapesBoard).vm.$emit('swap', cell, other)
      await flushPromises()
      if ((loadRun(mode)?.movesMade ?? 0) > before) return
    }
  }
  throw new Error('no valid move found')
}

describe('Shapes views', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    localStorage.clear()
    settings.value.locale = 'en'
    settings.value.motion = 'reduced'
    levelProgress.value = { level: 1 }
    resetStats()
    document.body.innerHTML = ''
  })

  it('lobby lists the modes with the current level and instructions first', async () => {
    levelProgress.value = { level: 7 }
    const { wrapper } = await mountAt('/shapes')
    const labels = wrapper.findAll('.choice__label').map((el) => el.text())
    expect(labels).toEqual(['Zen', 'Time', 'Level 7'])
    // Level 7 > 1 means the player has played: instructions move to the bottom.
    expect(wrapper.find('.lobby--played').exists()).toBe(true)
    wrapper.unmount()
  })

  it('lobby shows the instructions on top for new players', async () => {
    const { wrapper } = await mountAt('/shapes')
    expect(wrapper.find('.lobby--played').exists()).toBe(false)
    expect(wrapper.text()).toContain('Level 1')
    wrapper.unmount()
  })

  it('has no level select any more', async () => {
    expect(routes.some((route) => route.path === '/shapes/levels')).toBe(false)
  })

  it('starts the current level and offers Home and the next level after a win', async () => {
    levelProgress.value = { level: 3 }
    const { wrapper, router } = await mountAt('/shapes/play/levels?new=1')
    expect(wrapper.text()).toContain('Level 3')
    expect(loadRun('levels')).toBeNull() // nothing saved before the first move
    await playAnyMove(wrapper, 'levels')
    expect(loadRun('levels')!.level!.n).toBe(3)
    wrapper.unmount() // persists the run
    // Targets intro level: clear all target tiles by hand, the next move wins.
    const run = loadRun('levels')!
    const targets = run.level!.field.targets.map(() => 0)
    const cleared = { ...run, level: { ...run.level!, field: { ...run.level!.field, targets } } }
    localStorage.setItem('riddles:shapes:current:levels:v2', JSON.stringify(cleared))

    const second = await mountAt('/shapes/play/levels')
    const move = listMoves(loadRun('levels')!.board, loadRun('levels')!.level!.field)[0]!
    second.wrapper.findComponent(ShapesBoard).vm.$emit('swap', move.a, move.b)
    await flushPromises()
    const dialog = document.body.textContent ?? ''
    expect(dialog).toContain('Level complete!')
    expect(dialog).toContain('Next level')
    expect(dialog).toContain('Home')
    expect(dialog).not.toContain('Play again')
    expect(levelProgress.value.level).toBe(4)
    const home = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes('Home'))!
    home.click()
    await flushPromises()
    expect(second.router.currentRoute.value.path).toBe('/')
    second.wrapper.unmount()
    expect(router.currentRoute.value.query.new).toBeUndefined()
  })

  it('starts a zen run, plays a move and saves it', async () => {
    const { wrapper, router } = await mountAt('/shapes/play/zen?new=1')
    expect(wrapper.findAll('.piece')).toHaveLength(64)
    expect(router.currentRoute.value.query.new).toBeUndefined()

    // An untouched run is not saved (no "Continue" for merely opening Zen).
    expect(loadRun('zen')).toBeNull()
    await playAnyMove(wrapper, 'zen')

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
    // Try neighbouring swaps (with animations running) until one is valid.
    search: for (let cell = 0; cell < 64; cell++) {
      for (const other of [cell + 1, cell + 8]) {
        if (other >= 64 || (other === cell + 1 && cell % 8 === 7)) continue
        wrapper.findComponent(ShapesBoard).vm.$emit('swap', cell, other)
        await vi.advanceTimersByTimeAsync(5000)
        await flushPromises()
        if (loadRun('zen')) break search
      }
    }

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

  it('shows goals and moves in levels mode', async () => {
    const { wrapper } = await mountAt('/shapes/play/levels?new=1')
    expect(wrapper.text()).toContain('Level 1')
    expect(wrapper.find('.goals').exists()).toBe(true)
    expect(wrapper.find('.moves').text()).toContain('Moves left')
    wrapper.unmount()
  })

  it('renders obstacles of a level on the board', async () => {
    levelProgress.value = { level: 7 } // crates intro
    const { wrapper } = await mountAt('/shapes/play/levels?new=1')
    const crates = wrapper.findAll('.cell-layer--crate').length
    expect(crates).toBeGreaterThan(0)
    expect(wrapper.findAll('.piece')).toHaveLength(64 - crates)
    wrapper.unmount()
  })

  it('does not keep a save when Zen is left without a move', async () => {
    const { wrapper } = await mountAt('/shapes/play/zen?new=1')
    wrapper.unmount()
    expect(loadRun('zen')).toBeNull()
    expect(localStorage.getItem('riddles:shapes:current:zen:v1')).toBeNull()
  })

  it('ends a Zen run from the pause menu, records the score and removes the save', async () => {
    const { wrapper } = await mountAt('/shapes/play/zen?new=1')
    await playAnyMove(wrapper, 'zen')
    const score = loadRun('zen')!.score
    expect(score).toBeGreaterThan(0)

    await wrapper.find('.app-bar__actions button').trigger('click')
    const endButton = [...document.querySelectorAll<HTMLButtonElement>('.dialog .app-btn')].find(
      (button) => button.textContent?.includes('End game'),
    )
    expect(endButton).toBeDefined()
    endButton!.click()
    await flushPromises()

    expect(loadRun('zen')).toBeNull()
    expect(document.body.textContent).toContain('Game ended')
    expect(getVariantStats('shapes', 'zen').bestScore).toBe(score)
    wrapper.unmount()
  })

  it('redirects to the lobby when there is nothing to resume', async () => {
    const { wrapper, router } = await mountAt('/shapes/play/time')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('shapes')
    wrapper.unmount()
  })
})
