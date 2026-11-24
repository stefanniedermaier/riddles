import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { getVariantStats, resetStats } from '@/core/stats'
import { load } from '@/core/storage'
import CodeBreakerPlay from '../CodeBreakerPlay.vue'
import { SAVE_KEY } from '../index'
import { generatePuzzle } from '../logic/logic'
import { isCodeSave } from '../logic/types'

const SEED = 4242
vi.mock('@/core/rng', async (original) => ({
  ...(await original<typeof import('@/core/rng')>()),
  randomSeed: () => SEED,
}))

const Empty = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Empty },
      { path: '/codebreaker', name: 'codebreaker', component: Empty },
      { path: '/codebreaker/play', name: 'codebreaker-play', component: CodeBreakerPlay },
    ],
  })
}

const saved = () => load(SAVE_KEY, null, (raw) => (isCodeSave(raw) ? raw : undefined))

async function start(difficulty = 'easy') {
  const router = makeRouter()
  await router.push(`/codebreaker/play?new=${difficulty}`)
  const wrapper = mount(CodeBreakerPlay, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  const color = async (n: number) => {
    await wrapper.findAll('.palette__btn')[n]!.trigger('click')
  }
  const guessButton = () => wrapper.findAll('.toolbar button').find((b) => b.text() === 'Guess')!
  return { wrapper, router, color, guessButton }
}

describe('CodeBreakerPlay', () => {
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

  it('fills the slots, submits a guess with feedback and saves', async () => {
    const { wrapper, router, color, guessButton } = await start()
    expect(router.currentRoute.value.query.new).toBeUndefined()
    expect(wrapper.findAll('.palette__btn')).toHaveLength(6)
    expect(guessButton().attributes('disabled')).toBeDefined()
    for (const n of [0, 1, 2, 3]) await color(n)
    expect(saved()).toBeNull()
    await guessButton().trigger('click')
    expect(saved()?.guesses).toEqual([[0, 1, 2, 3]])
    expect(getVariantStats('codebreaker', 'easy').started).toBe(1)
    expect(wrapper.findAll('.row .dots')[0]!.attributes('aria-label')).toMatch(/right place/)
    wrapper.unmount()
  })

  it('tapping a selected filled slot clears it; repeats are refused on Easy', async () => {
    const { wrapper, color, guessButton } = await start()
    for (const n of [0, 0, 1, 2]) await color(n)
    await guessButton().trigger('click')
    expect(saved()).toBeNull() // not submitted
    const slots = wrapper.findAll('.slot')
    await slots[1]!.trigger('click')
    await slots[1]!.trigger('click')
    expect(slots[1]!.attributes('aria-label')).toContain('empty')
    wrapper.unmount()
  })

  it('wins by following hints and records the time', async () => {
    const { wrapper, guessButton } = await start('medium')
    for (let i = 0; i < 10 && !document.body.textContent?.includes('Solved!'); i++) {
      await wrapper.find('.toolbar button[aria-label="Hint"]').trigger('click')
      await guessButton().trigger('click')
      await flushPromises()
    }
    await vi.waitFor(() => expect(document.body.textContent).toContain('Solved!'))
    expect(saved()).toBeNull()
    expect(getVariantStats('codebreaker', 'medium')).toMatchObject({ started: 1, finished: 1 })
    expect(wrapper.findAll('.secret__peg')[0]!.attributes('aria-label')).not.toBe('hidden')
    wrapper.unmount()
  })

  it('loses after the last guess and shows the code', async () => {
    const { wrapper, color, guessButton } = await start()
    const wrong = [...generatePuzzle('easy', SEED).code].reverse() // distinct colours: never the code
    for (let i = 0; i < 10; i++) {
      for (const n of wrong) await color(n)
      await guessButton().trigger('click')
      await flushPromises()
    }
    await vi.waitFor(() => expect(document.body.textContent).toContain('Out of guesses'))
    expect(saved()).toBeNull()
    expect(getVariantStats('codebreaker', 'easy')).toMatchObject({ started: 1, finished: 0 })
    expect(wrapper.findAll('.secret__peg')[0]!.attributes('aria-label')).not.toBe('hidden')
    wrapper.unmount()
  })
})
