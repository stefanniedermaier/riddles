import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { load } from '@/core/storage'
import CrownsPlay from '../CrownsPlay.vue'
import { SAVE_KEY } from '../index'
import { generatePuzzle } from '../logic/generator'
import { isCrownsSave, type CrownsPuzzle } from '../logic/types'
import { crownsPool } from '../pool'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/crowns', name: 'crowns', component: { template: '<div>lobby</div>' } },
      { path: '/crowns/play', name: 'crowns-play', component: CrownsPlay },
    ],
  })
}

describe('CrownsPlay', () => {
  beforeEach(() => {
    localStorage.clear()
    settings.value.locale = 'en'
    settings.value.motion = 'reduced'
  })
  afterEach(() => {
    document.body.innerHTML = ''
    settings.value.motion = 'system'
  })

  it('starts a new game, saves moves and can be solved with hints', async () => {
    const router = makeRouter()
    await router.push('/crowns/play?new=easy')
    const wrapper = mount(CrownsPlay, { global: { plugins: [router] }, attachTo: document.body })

    await vi.waitFor(() => expect(wrapper.findAll('.cell')).toHaveLength(36), { timeout: 10_000 })
    expect(router.currentRoute.value.query.new).toBeUndefined()

    // Keyboard tap on the first cell marks it and the move is saved.
    await wrapper.find('.crowns-board').trigger('keydown', { key: 'Enter' })
    const saved = load(SAVE_KEY, null, (raw) => (isCrownsSave(raw) ? raw : undefined))
    expect(saved?.cells[0]).toBe(1)
    await wrapper.find('.crowns-board').trigger('keydown', { key: 'Enter' })
    await wrapper.find('.crowns-board').trigger('keydown', { key: 'Enter' })

    // Ask for hints and apply them until the puzzle is solved.
    for (let i = 0; i < 80 && !document.body.textContent?.includes('Solved!'); i++) {
      const hintButton = wrapper.findAll('.toolbar button').find((b) => b.text() === 'Hint')
      if (!hintButton) break
      await hintButton.trigger('click')
      const text = wrapper.find('.hint__text').text()
      expect(text).not.toContain('{')
      await wrapper.find('.hint .app-btn').trigger('click')
      await flushPromises()
    }

    await vi.waitFor(() => expect(document.body.textContent).toContain('Solved!'))
    expect(load(SAVE_KEY, null)).toBeNull()
    wrapper.unmount()
  })

  it('undoes taps step by step and keeps the history in the save', async () => {
    const router = makeRouter()
    await router.push('/crowns/play?new=easy')
    const wrapper = mount(CrownsPlay, { global: { plugins: [router] }, attachTo: document.body })
    await vi.waitFor(() => expect(wrapper.findAll('.cell')).toHaveLength(36), { timeout: 10_000 })

    const board = wrapper.find('.crowns-board')
    const undoButton = () => wrapper.find('.toolbar__undo')
    expect(undoButton().attributes('disabled')).toBeDefined()

    await board.trigger('keydown', { key: 'Enter' }) // ✕
    await board.trigger('keydown', { key: 'Enter' }) // crown
    const saveNow = () => load(SAVE_KEY, null, (raw) => (isCrownsSave(raw) ? raw : undefined))
    expect(saveNow()?.cells[0]).toBe(2)
    expect(saveNow()?.undo).toHaveLength(2)

    await undoButton().trigger('click')
    expect(saveNow()?.cells[0]).toBe(1)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    await flushPromises()
    expect(saveNow()?.cells[0]).toBe(0)
    expect(saveNow()?.undo).toHaveLength(0)
    expect(undoButton().attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('does not jump back into the game when left while a puzzle is generated', async () => {
    // Hold the generation until the player has left the view.
    let deliver!: (puzzle: CrownsPuzzle) => void
    const take = vi
      .spyOn(crownsPool, 'take')
      .mockReturnValue(new Promise<CrownsPuzzle>((resolve) => (deliver = resolve)))
    const router = makeRouter()
    await router.push('/crowns')
    await router.push('/crowns/play?new=expert')
    const wrapper = mount(CrownsPlay, { global: { plugins: [router] } })
    await vi.waitFor(() => expect(router.currentRoute.value.query.new).toBeUndefined())

    router.back()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('crowns'))
    const replace = vi.spyOn(router, 'replace')
    const push = vi.spyOn(router, 'push')
    wrapper.unmount()

    // The generation finishes after the player left: no navigation back into the game.
    deliver(generatePuzzle('easy', 1))
    await flushPromises()
    expect(replace).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(load(SAVE_KEY, null)).toBeNull()
    take.mockRestore()
  })

  it('redirects to the lobby without a saved game', async () => {
    const router = makeRouter()
    await router.push('/crowns/play')
    mount(CrownsPlay, { global: { plugins: [router] } })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('crowns')
  })
})
