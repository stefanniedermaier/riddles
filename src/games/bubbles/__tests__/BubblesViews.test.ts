import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { RouterView, createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { getVariantStats, recordFinish, recordStart, resetStats } from '@/core/stats'
import BubblesBoard from '../BubblesBoard.vue'
import { emptyCells, newRun, type BubblesRun } from '../logic/engine'
import { COLS } from '../logic/grid'
import { routes } from '../routes'
import { bubblesSettings } from '../settings'
import { bestTimeSpeed, levelProgress, loadRun } from '../store'

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

/** Animation frames that jump far ahead: a flight lands on its second frame. */
function fastFrames(): void {
  let now = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback((now += 10_000)), 0) as unknown as number,
  )
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => clearTimeout(handle))
}

async function press(key: string, extra: KeyboardEventInit = {}): Promise<void> {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ...extra }))
  await flushPromises()
}

async function settle(): Promise<void> {
  await vi.runAllTimersAsync()
  await flushPromises()
}

/** An endless run with two reds under the ceiling and a red to shoot. */
function prepare(extra: Partial<BubblesRun> = {}): BubblesRun {
  const cells = emptyCells()
  for (let c = 0; c < COLS; c++) cells[c] = 1
  cells[COLS + 3] = 0
  cells[COLS + 4] = 0
  const run: BubblesRun = { ...newRun('endless', 5), cells, current: 0, next: 2, shots: 1, ...extra }
  localStorage.setItem('riddles:bubbles:current:endless:v1', JSON.stringify(run))
  return run
}

describe('Bubbles views', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fastFrames()
    localStorage.clear()
    document.body.innerHTML = ''
    settings.value.locale = 'en'
    settings.value.motion = 'reduced'
    bubblesSettings.value = { aimLine: 'target', symbols: true, speed: 'normal' }
    levelProgress.value = { level: 1, stars: [] }
    bestTimeSpeed.value = { speed: null }
    resetStats()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('lobby: shows the modes, a saved run, the level, stars and the best time score with its speed', async () => {
    prepare({ score: 40 })
    recordStart('bubbles', 'time')
    recordFinish('bubbles', 'time', { score: 1200 })
    bestTimeSpeed.value = { speed: 'fast' }
    levelProgress.value = { level: 4, stars: [3, 2, 1] }
    const { wrapper } = await mountAt('/bubbles')
    const text = wrapper.text()
    expect(text).toContain('Continue · 40 points')
    expect(text).toContain('Levels · Level 4')
    expect(text).toContain('6 stars')
    expect(text).toContain('Best 1,200 · Fast')
    wrapper.unmount()
  })

  it('play: aims with the keyboard, shoots, pops and saves', async () => {
    prepare()
    const { wrapper } = await mountAt('/bubbles/play/endless')
    // The keyboard shows the aim line.
    expect(wrapper.find('.aim__line').exists()).toBe(false)
    await press('ArrowLeft')
    await press('ArrowRight')
    expect(wrapper.find('.aim__line').exists()).toBe(true)
    await press(' ')
    await settle()
    expect(wrapper.find('[aria-live="polite"]').text()).toMatch(/^3 popped, 0 fell/)
    expect(wrapper.find('.hud__value').text()).toBe('30')
    const saved = loadRun('endless')!
    expect(saved.score).toBe(30)
    expect(saved.shots).toBe(2)
    wrapper.unmount()
  })

  it('play: swaps with X and with the next-bubble button', async () => {
    prepare()
    const { wrapper } = await mountAt('/bubbles/play/endless')
    await press('x')
    expect(loadRun('endless')).toMatchObject({ current: 2, next: 0 })
    await wrapper.find('button.swap').trigger('click')
    expect(loadRun('endless')).toMatchObject({ current: 0, next: 2 })
    wrapper.unmount()
  })

  it('play: a full field ends the run, records the score and offers another game', async () => {
    const cells = emptyCells()
    for (let r = 0; r < 13; r++) for (let c = 0; c < COLS - (r % 2); c++) cells[r * COLS + c] = (r + c) % 2 === 0 ? 1 : 2
    prepare({ cells, current: 3, next: 3, score: 70 })
    const { wrapper } = await mountAt('/bubbles/play/endless')
    await press(' ')
    await settle()
    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog?.textContent).toContain('Game over')
    expect(getVariantStats('bubbles', 'endless').bestScore).toBe(70)
    expect(loadRun('endless')).toBeNull()
    wrapper.unmount()
  })

  it('board: a drag aims and a release shoots; dragging below the shooter cancels', async () => {
    const run = newRun('endless', 3)
    const wrapper = mount(BubblesBoard, {
      props: {
        cells: run.cells,
        parity: run.parity,
        marked: [],
        current: run.current,
        next: run.next,
        symbols: true,
        aimMode: 'full' as const,
        showAim: false,
        locked: false,
        flight: null,
        ghosts: [],
        pushKey: 0,
        danger: false,
        angle: 90,
        'onUpdate:angle': (angle: number) => wrapper.setProps({ angle }),
      },
      attachTo: document.body,
    })
    const svg = wrapper.find('svg').element
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 90, height: 140, right: 90, bottom: 140, x: 0, y: 0, toJSON: () => ({}) })
    const pointer = (type: string, x: number, y: number) =>
      new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, isPrimary: true, pointerType: 'mouse', button: 0, bubbles: true })
    wrapper.find('.bubbles-board').element.dispatchEvent(pointer('pointerdown', 20, 60))
    await flushPromises()
    expect(wrapper.find('.aim__line').exists()).toBe(true)
    expect(wrapper.find('.aim__landing').exists()).toBe(true)
    window.dispatchEvent(pointer('pointerup', 20, 60))
    expect(wrapper.emitted('shoot')).toHaveLength(1)
    const angle = wrapper.emitted('shoot')![0]![0] as number
    expect(angle).toBeGreaterThan(90)

    // Down, then back below the shooter: no shot.
    wrapper.find('.bubbles-board').element.dispatchEvent(pointer('pointerdown', 60, 60))
    window.dispatchEvent(pointer('pointermove', 60, 139))
    window.dispatchEvent(pointer('pointerup', 60, 139))
    expect(wrapper.emitted('shoot')).toHaveLength(1)
    wrapper.unmount()
  })
})
