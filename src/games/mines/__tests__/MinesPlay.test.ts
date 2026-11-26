import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { load } from '@/core/storage'
import { playProps } from '@/games/routes'
import MinesBoard from '../MinesBoard.vue'
import MinesPlay from '../MinesPlay.vue'
import { SAVE_KEY } from '../index'
import { boardFrom } from '../logic/__tests__/helpers'
import { generatePuzzle } from '../logic/generator'
import { FLAGGED, isMinesSave, type MinesPuzzle } from '../logic/types'
import { minesPool } from '../pool'
import { minesSettings } from '../settings'

const Empty = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/mines', name: 'mines', component: Empty },
      { path: '/mines/play', name: 'mines-play', component: MinesPlay },
    ],
  })
}

const saved = () => load(SAVE_KEY, null, (raw) => (isMinesSave(raw) ? raw : undefined))

//  S . . .
//  . . 1 1
//  1 1 2 *
//  * . 2 *      start opens the top; cells 13 (.) is safe, 12/15/11 are mines
const testBoard = (): MinesPuzzle => ({ ...boardFrom(['S...', '....', '...*', '*..*']) })

async function start(puzzle: MinesPuzzle) {
  vi.spyOn(minesPool, 'take').mockResolvedValue(puzzle)
  const router = makeRouter()
  await router.push('/mines/play?new=easy')
  const wrapper = mount(MinesPlay, { props: playProps(router.currentRoute.value), global: { plugins: [router] }, attachTo: document.body })
  await vi.waitFor(() => expect(wrapper.find('.mines-board').exists()).toBe(true))
  const board = () => wrapper.findComponent(MinesBoard)
  const emit = async (event: 'tap' | 'alt' | 'flag', cell: number) => {
    board().vm.$emit(event, cell)
    await flushPromises()
  }
  const button = (text: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(text))!
  return { wrapper, router, emit, button }
}

describe('MinesPlay', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
    settings.value.locale = 'en'
    settings.value.motion = 'reduced'
    minesSettings.value = { longPress: true, chord: true, instantMistakes: false }
  })
  afterEach(() => {
    document.body.innerHTML = ''
    settings.value.motion = 'system'
    vi.restoreAllMocks()
  })

  it('starts with the start area open and saves only after the first move', async () => {
    const { wrapper, router, emit } = await start(testBoard())
    expect(router.currentRoute.value.query.new).toBeUndefined()
    expect(wrapper.findAll('.cell--open').length).toBeGreaterThanOrEqual(9)
    expect(saved()).toBeNull()

    await emit('alt', 11) // long press flags while revealing
    expect(saved()?.cells[11]).toBe(FLAGGED)
    expect(getVariantStats('mines', 'easy').started).toBe(1)
    expect(wrapper.find('.hud').text()).toContain('2') // 3 mines − 1 flag
    wrapper.unmount()
  })

  it('a mine hit can be undone and counts as a mistake', async () => {
    const { wrapper, emit, button } = await start(testBoard())
    await emit('tap', 12)
    await vi.waitFor(() => expect(document.body.textContent).toContain('Mine hit!'))
    expect(wrapper.find('.cell--hit').exists()).toBe(true)
    expect(saved()?.hit).toBe(12)
    // Menu and home sit side by side as icon buttons, also after a hit.
    expect(document.body.querySelector('button[aria-label="Mines menu"]')).not.toBeNull()
    expect(document.body.querySelector('button[aria-label="Home"]')).not.toBeNull()

    button('Undo move').click()
    await flushPromises()
    expect(wrapper.find('.cell--hit').exists()).toBe(false)
    expect(saved()).toMatchObject({ mistakes: 1 })
    expect(saved()?.hit).toBeUndefined()
    wrapper.unmount()
  })

  it('check finds wrong flags once', async () => {
    const { wrapper, emit } = await start(testBoard())
    await emit('flag', 13)
    const check = wrapper.find('button[aria-label="Check"]')
    await check.trigger('click')
    await check.trigger('click')
    expect(saved()?.mistakes).toBe(1)
    expect(wrapper.find('.cell--wrong').exists()).toBe(true)
    wrapper.unmount()
  })

  it('can be solved with hints and records the time', async () => {
    const puzzle = generatePuzzle('easy', 3)
    const { wrapper } = await start(puzzle)
    for (let i = 0; i < 200 && !document.body.textContent?.includes('Solved!'); i++) {
      if (!wrapper.find('.mines-board--solved').exists()) {
        await wrapper.find('button[aria-label="Hint"]').trigger('click')
        const apply = wrapper.findAll('.toolbar button').find((b) => b.text() === 'Apply')!
        await apply.trigger('click')
      }
      await flushPromises()
    }
    await vi.waitFor(() => expect(document.body.textContent).toContain('Solved!'))
    expect(saved()).toBeNull()
    expect(getVariantStats('mines', 'easy')).toMatchObject({ started: 1, finished: 1 })
    expect(wrapper.findAll('.cell .cell__icon')).toHaveLength(puzzle.mines.length) // all flagged
    wrapper.unmount()
  })

  it('redirects to the lobby without a saved game', async () => {
    const router = makeRouter()
    await router.push('/mines/play')
    mount(MinesPlay, { props: playProps(router.currentRoute.value), global: { plugins: [router] } })
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('mines')
  })
})
