import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { load } from '@/core/storage'
import { playProps } from '@/games/routes'
import { SAVE_KEY } from '../index'
import LinksPlay from '../LinksPlay.vue'
import { generatePuzzle } from '../logic/generator'
import { isLinksSave, type LinksPuzzle } from '../logic/types'
import { linksPool } from '../pool'

const Empty = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/links', name: 'links', component: Empty },
      { path: '/links/play', name: 'links-play', component: LinksPlay },
    ],
  })
}

const saved = () => load(SAVE_KEY, null, (raw) => (isLinksSave(raw) ? raw : undefined))

describe('LinksPlay', () => {
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

  it('starts a game, can be solved with hints and shows the result', async () => {
    vi.spyOn(linksPool, 'take').mockResolvedValue(generatePuzzle('easy', 1))
    const router = makeRouter()
    await router.push('/links/play?new=easy')
    const wrapper = mount(LinksPlay, { props: playProps(router.currentRoute.value), global: { plugins: [router] }, attachTo: document.body })
    await vi.waitFor(() => expect(wrapper.findAll('.cell')).toHaveLength(25))
    expect(router.currentRoute.value.query.new).toBeUndefined()
    // Merely opening a puzzle neither saves it nor counts it as started.
    expect(saved()).toBeNull()
    expect(getVariantStats('links', 'easy').started).toBe(0)

    const hint = () => wrapper.findAll('.toolbar button').find((b) => b.text() === 'Hint')!
    await hint().trigger('click')
    await flushPromises()
    expect(getVariantStats('links', 'easy').started).toBe(1)
    for (let i = 0; i < 30 && !document.body.textContent?.includes('Solved!'); i++) {
      await hint().trigger('click')
      await flushPromises()
    }
    await vi.waitFor(() => expect(document.body.textContent).toContain('Solved!'))
    expect(document.body.textContent).toContain('Links menu')
    expect(saved()).toBeNull()
    expect(getVariantStats('links', 'easy').finished).toBe(1)
    wrapper.unmount()
  })

  it('draws by dragging, counts moves and undoes strokes', async () => {
    const puzzle: LinksPuzzle = generatePuzzle('easy', 5)
    vi.spyOn(linksPool, 'take').mockResolvedValue(puzzle)
    const router = makeRouter()
    await router.push('/links/play?new=easy')
    const wrapper = mount(LinksPlay, { props: playProps(router.currentRoute.value), global: { plugins: [router] }, attachTo: document.body })
    await vi.waitFor(() => expect(wrapper.findAll('.cell')).toHaveLength(25))

    const board = wrapper.findComponent({ name: 'LinksBoard' })
    const path = puzzle.solution[0]!
    board.vm.$emit('start', path[0])
    for (const cell of path.slice(1)) board.vm.$emit('move', cell)
    board.vm.$emit('end')
    await flushPromises()
    expect(saved()?.paths[0]).toEqual(path)
    expect(saved()?.moves).toBe(1)
    expect(wrapper.text()).toContain('1 / ')

    // Same colour again: no extra move.
    board.vm.$emit('start', path[path.length - 1])
    board.vm.$emit('move', path[path.length - 2])
    board.vm.$emit('end')
    await flushPromises()
    expect(saved()?.moves).toBe(1)

    await wrapper.find('.toolbar__undo').trigger('click')
    expect(saved()?.paths[0]).toEqual(path)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    await flushPromises()
    expect(saved()?.paths[0]).toEqual([])
    expect(wrapper.find('.toolbar__undo').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('does not navigate when left while a puzzle is generated', async () => {
    let deliver!: (puzzle: LinksPuzzle) => void
    vi.spyOn(linksPool, 'take').mockReturnValue(new Promise((resolve) => (deliver = resolve)))
    const router = makeRouter()
    await router.push('/links')
    await router.push('/links/play?new=expert')
    const wrapper = mount(LinksPlay, { props: playProps(router.currentRoute.value), global: { plugins: [router] } })
    await vi.waitFor(() => expect(router.currentRoute.value.query.new).toBeUndefined())
    router.back()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('links'))
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
    await router.push('/links/play')
    mount(LinksPlay, { props: playProps(router.currentRoute.value), global: { plugins: [router] } })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('links')
  })
})
