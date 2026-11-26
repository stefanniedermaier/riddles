import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { RouterView, createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { getVariantStats, recordFinish, recordStart, resetStats } from '@/core/stats'
import { newRun, type SnakeRun } from '../logic/engine'
import SnakeBoard from '../SnakeBoard.vue'
import SnakePad from '../SnakePad.vue'
import { routes } from '../routes'
import { snakeSettings } from '../settings'
import { bestSpeeds, loadRun } from '../store'

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

/** Stores a calm run of the classic mode (head at the middle, heading right). */
function prepare(extra: Partial<SnakeRun> = {}): SnakeRun {
  const run: SnakeRun = { ...newRun('classic', 'calm', 5), steps: 2, food: 0, ...extra }
  localStorage.setItem('riddles:snake:current:classic:v1', JSON.stringify(run))
  return run
}

async function press(key: string): Promise<void> {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
  await flushPromises()
}

function pointer(type: string, x: number, y: number, extra: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, isPrimary: true, pointerType: 'touch', bubbles: true, ...extra })
}

describe('Snake views', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    settings.value.locale = 'en'
    settings.value.motion = 'reduced'
    snakeSettings.value = { speed: 'normal', pad: false }
    bestSpeeds.value = { classic: null, open: null, maze: null }
    resetStats()
  })

  it('lobby: shows the modes, a saved run with its speed and the best score with its speed', async () => {
    prepare({ score: 4 })
    recordStart('snake', 'open')
    recordFinish('snake', 'open', { score: 12 })
    bestSpeeds.value = { classic: null, open: 'fast', maze: null }
    const { wrapper } = await mountAt('/snake')
    const text = wrapper.text()
    expect(text).toContain('Continue · 4 points · Calm')
    expect(text).toContain('17×17 · walls and stones')
    expect(text).toContain('Best 12 · Fast')
    wrapper.unmount()
  })

  it('calm speed: every key is one step, the opposite direction is ignored', async () => {
    const run = prepare()
    const { wrapper } = await mountAt('/snake/play/classic')
    await press('ArrowRight')
    expect(loadRun('classic')).not.toBeNull()
    await press('ArrowLeft') // back into the snake: nothing happens
    await press('ArrowUp')
    expect(wrapper.find('[aria-live="polite"]').text()).toMatch(/^Length 3\. Fruit: .+ up/)
    wrapper.unmount()
    const saved = loadRun('classic')!
    expect(saved.steps).toBe(run.steps + 2)
    expect(saved.body[0]).toBe(run.body[0]! + 1 - 15)
  })

  it('calm speed: running into the wall ends the run with its score and speed', async () => {
    // Head two cells from the right wall.
    prepare({ body: [7 * 15 + 13, 7 * 15 + 12, 7 * 15 + 11] })
    const { wrapper } = await mountAt('/snake/play/classic')
    await press('ArrowRight')
    await press('ArrowRight')
    await press('ArrowRight')
    expect(document.body.textContent).toContain('Game over')
    expect(loadRun('classic')).toBeNull()
    expect(getVariantStats('snake', 'classic').finished).toBe(1)
    expect(bestSpeeds.value.classic).toBe('calm')
    wrapper.unmount()
  })

  it('a new run takes the speed from the settings and shows the pad when it is on', async () => {
    snakeSettings.value = { speed: 'fast', pad: true }
    const { wrapper, router } = await mountAt('/snake/play/maze?new=1')
    await flushPromises()
    expect(router.currentRoute.value.query.new).toBeUndefined()
    expect(wrapper.find('.pad').exists()).toBe(true)
    expect(wrapper.text()).toContain('Swipe, tap or press an arrow key to start')
    wrapper.unmount()
  })
})

describe('SnakeBoard input', () => {
  const props = {
    size: 15,
    body: [112, 111, 110],
    leftTail: null,
    progress: 1,
    direction: 'right' as const,
    food: 0,
    stones: [],
    wrap: false,
    dead: false,
  }

  it('turns as soon as a swipe is long enough, and again when it changes direction', async () => {
    const wrapper = mount(SnakeBoard, { props, attachTo: document.body })
    wrapper.element.dispatchEvent(pointer('pointerdown', 100, 100))
    window.dispatchEvent(pointer('pointermove', 100, 90))
    expect(wrapper.emitted('turn')).toBeUndefined()
    window.dispatchEvent(pointer('pointermove', 100, 60))
    window.dispatchEvent(pointer('pointermove', 70, 60))
    window.dispatchEvent(pointer('pointerup', 70, 60))
    expect(wrapper.emitted('turn')).toEqual([['up'], ['left']])
    expect(wrapper.emitted('tap')).toBeUndefined()
    wrapper.unmount()
  })

  it('a tap without a swipe emits tap; a second finger pauses instead', async () => {
    const wrapper = mount(SnakeBoard, { props, attachTo: document.body })
    wrapper.element.dispatchEvent(pointer('pointerdown', 100, 100))
    window.dispatchEvent(pointer('pointerup', 102, 101))
    expect(wrapper.emitted('tap')).toHaveLength(1)
    wrapper.element.dispatchEvent(pointer('pointerdown', 100, 100))
    wrapper.element.dispatchEvent(pointer('pointerdown', 150, 100, { pointerId: 2, isPrimary: false }))
    expect(wrapper.emitted('multitouch')).toHaveLength(1)
    window.dispatchEvent(pointer('pointermove', 100, 40))
    expect(wrapper.emitted('turn')).toBeUndefined()
    wrapper.unmount()
  })

  it('draws the snake through the border as two pieces in the open mode', () => {
    const wrapper = mount(SnakeBoard, { props: { ...props, body: [0, 14, 13], wrap: true } })
    expect(wrapper.find('.snake__body').attributes('d')?.match(/M/g)).toHaveLength(2)
    wrapper.unmount()
  })

  it('lets the head glide through the border instead of jumping (open mode)', async () => {
    settings.value.motion = 'full'
    // The head just came out on the left (cell 0), coming from the right edge (cell 14).
    const wrapper = mount(SnakeBoard, { props: { ...props, body: [0, 14, 13], wrap: true, progress: 0.5 } })
    const heads = wrapper.findAll('.snake__head').map((head) => Number(head.attributes('cx')))
    // Half way: half of the head on each side of the border.
    expect(heads.sort((a, b) => a - b)).toEqual([0, 15])
    await wrapper.setProps({ progress: 1 })
    expect(wrapper.findAll('.snake__head').map((head) => Number(head.attributes('cx')))).toEqual([0.5])
    wrapper.unmount()
    settings.value.motion = 'reduced'
  })

  it('a quick flick that ends before a move event still turns', () => {
    const wrapper = mount(SnakeBoard, { props, attachTo: document.body })
    wrapper.element.dispatchEvent(pointer('pointerdown', 100, 100))
    window.dispatchEvent(pointer('pointermove', 100, 92))
    window.dispatchEvent(pointer('pointerup', 100, 60))
    expect(wrapper.emitted('turn')).toEqual([['up']])
    expect(wrapper.emitted('tap')).toBeUndefined()
    wrapper.unmount()
  })

  it('waits while a swipe starts diagonally, then takes the dominant direction', () => {
    const wrapper = mount(SnakeBoard, { props, attachTo: document.body })
    wrapper.element.dispatchEvent(pointer('pointerdown', 100, 100))
    window.dispatchEvent(pointer('pointermove', 126, 78)) // diagonal: no decision yet
    expect(wrapper.emitted('turn')).toBeUndefined()
    window.dispatchEvent(pointer('pointermove', 130, 50))
    expect(wrapper.emitted('turn')).toEqual([['up']])
    window.dispatchEvent(pointer('pointerup', 130, 48))
    expect(wrapper.emitted('turn')).toEqual([['up']])
    wrapper.unmount()
  })
})

describe('SnakePad', () => {
  it('turns on press, and on keyboard activation', async () => {
    const wrapper = mount(SnakePad)
    await wrapper.find('[aria-label="Up"]').trigger('pointerdown')
    await wrapper.find('[aria-label="Left"]').trigger('click', { detail: 0 })
    await wrapper.find('[aria-label="Left"]').trigger('click', { detail: 1 }) // after a press
    expect(wrapper.emitted('turn')).toEqual([['up'], ['left']])
  })
})
