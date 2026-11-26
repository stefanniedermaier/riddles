import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { RouterView, createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { getVariantStats, recordStart, resetStats } from '@/core/stats'
import type { Variant } from '../index'
import type { MergeRun } from '../logic/engine'
import MergeBoard from '../MergeBoard.vue'
import { routes } from '../routes'
import { loadRun, records } from '../store'

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

/** Stores a prepared run (row-major grid, 0 = empty) as the saved game of `variant`. */
function prepare(variant: Variant, grid: number[][], extra: Partial<MergeRun> = {}): void {
  const size = grid.length
  const tiles = grid.flatMap((row, r) =>
    row.flatMap((value, c) => (value ? [{ id: r * size + c + 1, value, cell: r * size + c }] : [])),
  )
  const run: MergeRun = {
    variant,
    size,
    tiles,
    score: 0,
    moves: 3,
    rngState: 99,
    nextId: 100,
    won: false,
    keepPlaying: false,
    over: false,
    ...extra,
  }
  localStorage.setItem(`riddles:merge:current:${variant}:v1`, JSON.stringify(run))
}

async function press(key: string): Promise<void> {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
  await flushPromises()
}

describe('Merge views', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    settings.value.locale = 'en'
    settings.value.motion = 'reduced'
    resetStats()
    records.value = { small: 0, classic: 0, large: 0 }
  })

  it('lobby lists the variants with their targets; rules first for new players', async () => {
    const { wrapper } = await mountAt('/merge')
    const labels = wrapper.findAll('.choice__label').map((el) => el.text())
    expect(labels).toEqual(['Small · 3×3', 'Classic · 4×4', 'Large · 5×5'])
    expect(wrapper.text()).toContain('Reach 2,048')
    expect(wrapper.find('.lobby--played').exists()).toBe(false)
    wrapper.unmount()

    recordStart('merge', 'classic')
    const again = await mountAt('/merge')
    expect(again.wrapper.find('.lobby--played').exists()).toBe(true)
    again.wrapper.unmount()
  })

  it('does not save a new run before the first move', async () => {
    const { wrapper, router } = await mountAt('/merge/play/classic?new=1')
    expect(wrapper.findAll('.tile')).toHaveLength(2)
    await flushPromises()
    expect(router.currentRoute.value.query.new).toBeUndefined()
    wrapper.unmount()
    expect(loadRun('classic')).toBeNull()
  })

  it('plays moves with the keyboard and saves after each move', async () => {
    prepare('classic', [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    const { wrapper } = await mountAt('/merge/play/classic')
    await press('ArrowLeft')
    const saved = loadRun('classic')!
    expect(saved.moves).toBe(4)
    expect(saved.score).toBe(4)
    expect(saved.tiles.find((tile) => tile.cell === 0)?.value).toBe(4)
    expect(saved.tiles).toHaveLength(2) // merged tile + spawned tile

    await press('d') // WASD works too
    expect(loadRun('classic')!.moves).toBe(5)
    wrapper.unmount()
  })

  it('shows the target dialog once and lets the player keep going', async () => {
    prepare('classic', [
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    const { wrapper } = await mountAt('/merge/play/classic')
    await press('ArrowLeft')
    expect(document.body.textContent).toContain('You made 2,048!')
    const keep = [...document.querySelectorAll<HTMLButtonElement>('.dialog .app-btn')].find((b) =>
      b.textContent?.includes('Keep playing'),
    )!
    keep.click()
    await flushPromises()
    const saved = loadRun('classic')!
    expect(saved.won).toBe(true)
    expect(saved.keepPlaying).toBe(true)
    expect(document.body.textContent).not.toContain('You made 2,048!')
    wrapper.unmount()
  })

  it('ends the game when no move is left, records score and top tile', async () => {
    // Moving right frees the first cell of the last row only; whatever spawns there is stuck.
    prepare(
      'small',
      [
        [8, 16, 8],
        [16, 8, 16],
        [32, 64, 0],
      ],
      { score: 500 },
    )
    const { wrapper } = await mountAt('/merge/play/small')
    await press('ArrowRight')
    const text = document.body.textContent ?? ''
    expect(text).toContain('No more moves')
    // Menu and home are icon buttons, named by their label.
    expect(document.body.querySelector('button[aria-label="Merge menu"]')).not.toBeNull()
    expect(document.body.querySelector('button[aria-label="Home"]')).not.toBeNull()
    expect(loadRun('small')).toBeNull()
    expect(getVariantStats('merge', 'small').bestScore).toBe(500)
    expect(records.value.small).toBe(64)
    // Input is blocked after the game ended.
    await press('ArrowLeft')
    expect(loadRun('small')).toBeNull()
    wrapper.unmount()
  })

  it('redirects to the lobby when there is nothing to resume', async () => {
    const { wrapper, router } = await mountAt('/merge/play/large')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('merge')
    wrapper.unmount()
  })

  it('board turns swipes into moves (dominant axis, threshold)', async () => {
    const board = mount(MergeBoard, { props: { size: 4, tiles: [] } })
    const swipe = async (dx: number, dy: number) => {
      await board.find('.merge-board').trigger('pointerdown', { pointerId: 1, clientX: 100, clientY: 100, button: 0 })
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy }))
    }
    await swipe(60, 10)
    await swipe(-5, -80)
    await swipe(10, 5) // too short
    await swipe(-40, 20)
    expect(board.emitted('move')).toEqual([['right'], ['up'], ['left']])
    board.unmount()
  })
})
