import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { load } from '@/core/storage'
import { toasts } from '@/core/toast'
import { playProps } from '@/games/routes'
import { SAVE_KEY } from '../index'
import { generatePuzzle } from '../logic/generator'
import { isNonogramSave, type NonogramPuzzle } from '../logic/types'
import NonogramPlay from '../NonogramPlay.vue'
import { nonogramPool } from '../pool'
import { nonogramSettings } from '../settings'

const Empty = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/nonogram', name: 'nonogram', component: Empty },
      { path: '/nonogram/play', name: 'nonogram-play', component: NonogramPlay },
    ],
  })
}

const saved = () => load(SAVE_KEY, null, (raw) => (isNonogramSave(raw) ? raw : undefined))

/** Starts a game with a fixed puzzle (no generation in the test). */
async function start(puzzle: NonogramPuzzle = generatePuzzle('easy', 1)) {
  vi.spyOn(nonogramPool, 'take').mockResolvedValue(puzzle)
  const router = makeRouter()
  await router.push('/nonogram/play?new=easy')
  const wrapper = mount(NonogramPlay, { props: playProps(router.currentRoute.value), global: { plugins: [router] }, attachTo: document.body })
  await vi.waitFor(() => expect(wrapper.findAll('.cell')).toHaveLength(25))
  return { router, wrapper }
}

describe('NonogramPlay', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
    settings.value.locale = 'en'
    settings.value.motion = 'reduced'
    nonogramSettings.value.instantMistakes = true
  })
  afterEach(() => {
    document.body.innerHTML = ''
    settings.value.motion = 'system'
    vi.restoreAllMocks()
  })

  it('starts a game, can be solved with hints and shows the result', async () => {
    const { router, wrapper } = await start()
    expect(router.currentRoute.value.query.new).toBeUndefined()
    // Merely opening a puzzle neither saves it nor counts it as started.
    expect(saved()).toBeNull()
    expect(getVariantStats('nonogram', 'easy').started).toBe(0)

    for (let i = 0; i < 40 && !document.body.textContent?.includes('Solved!'); i++) {
      await wrapper.find('.toolbar button[aria-label="Hint"]').trigger('click')
      await flushPromises()
      const apply = wrapper.findAll('.toolbar button').find((b) => b.text() === 'Apply')
      expect(wrapper.find('.info__hint').text()).not.toContain('{')
      await apply!.trigger('click')
      await flushPromises()
    }
    await vi.waitFor(() => expect(document.body.textContent).toContain('Solved!'))
    expect(document.body.textContent).toContain('Nonogram menu')
    expect(document.body.textContent).toContain('Home')
    expect(saved()).toBeNull()
    expect(getVariantStats('nonogram', 'easy').finished).toBe(1)
    wrapper.unmount()
  })

  it('paints by dragging, counts mistakes and undoes strokes', async () => {
    const puzzle = generatePuzzle('easy', 11)
    const { wrapper } = await start(puzzle)
    const board = wrapper.findComponent({ name: 'NonogramBoard' })

    // Drag along the first row with the fill tool.
    board.vm.$emit('start', 0)
    for (const cell of [1, 2, 3, 4]) board.vm.$emit('move', cell)
    board.vm.$emit('end')
    await flushPromises()
    const row = saved()!.cells.slice(0, 5)
    expect(row).toEqual([1, 1, 1, 1, 1])
    const wrongInRow = puzzle.solution.slice(0, 5).filter((v) => v === 0).length
    expect(saved()!.mistakes).toBe(wrongInRow)
    expect(wrapper.findAll('.cell--wrong')).toHaveLength(wrongInRow)

    // Cross tool on a single cell.
    await wrapper.findAll('[role="radio"]')[1]!.trigger('click')
    board.vm.$emit('start', 24)
    board.vm.$emit('end')
    await flushPromises()
    expect(saved()!.cells[24]).toBe(2)

    await wrapper.find('.toolbar button[aria-label="Undo"]').trigger('click')
    expect(saved()!.cells[24]).toBe(0)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    await flushPromises()
    expect(saved()!.cells.every((m) => m === 0)).toBe(true)
    expect(saved()!.undo).toHaveLength(0)
    wrapper.unmount()
  })

  it('only shows and counts mistakes on "Check" when instant mode is off', async () => {
    nonogramSettings.value.instantMistakes = false
    const puzzle = generatePuzzle('easy', 11)
    const { wrapper } = await start(puzzle)
    const board = wrapper.findComponent({ name: 'NonogramBoard' })
    const wrongCell = puzzle.solution.indexOf(0)
    board.vm.$emit('start', wrongCell)
    board.vm.$emit('end')
    await flushPromises()
    expect(saved()!.mistakes).toBe(0)
    expect(wrapper.findAll('.cell--wrong')).toHaveLength(0)

    const check = wrapper.find('.toolbar button[aria-label="Check"]')
    await check.trigger('click')
    await flushPromises()
    expect(saved()!.mistakes).toBe(1)
    expect(wrapper.findAll('.cell--wrong')).toHaveLength(1)
    expect(toasts[0]?.text).toContain('1 mistake found')

    // Checking again without changes does not count the same mistake twice.
    await check.trigger('click')
    await flushPromises()
    expect(saved()!.mistakes).toBe(1)

    // Clearing the wrong mark removes the highlight.
    board.vm.$emit('start', wrongCell)
    board.vm.$emit('end')
    await flushPromises()
    expect(wrapper.findAll('.cell--wrong')).toHaveLength(0)
    wrapper.unmount()
  })

  it('does not navigate when left while a puzzle is generated', async () => {
    let deliver!: (puzzle: NonogramPuzzle) => void
    vi.spyOn(nonogramPool, 'take').mockReturnValue(new Promise((resolve) => (deliver = resolve)))
    const router = makeRouter()
    await router.push('/nonogram')
    await router.push('/nonogram/play?new=hard')
    const wrapper = mount(NonogramPlay, { props: playProps(router.currentRoute.value), global: { plugins: [router] } })
    await vi.waitFor(() => expect(router.currentRoute.value.query.new).toBeUndefined())
    router.back()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('nonogram'))
    const replace = vi.spyOn(router, 'replace')
    const push = vi.spyOn(router, 'push')
    wrapper.unmount()
    deliver(generatePuzzle('easy', 1))
    await flushPromises()
    expect(replace).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(saved()).toBeNull()
  })

  it('redirects to the menu without a saved game', async () => {
    const router = makeRouter()
    await router.push('/nonogram/play')
    mount(NonogramPlay, { props: playProps(router.currentRoute.value), global: { plugins: [router] } })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('nonogram')
  })
})
