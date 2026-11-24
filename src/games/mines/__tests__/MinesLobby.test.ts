import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { recordStart, resetStats } from '@/core/stats'
import MinesLobby from '../MinesLobby.vue'
import { minesPool } from '../pool'

const Empty = { template: '<div />' }

async function mountLobby() {
  vi.spyOn(minesPool, 'warm').mockImplementation(() => {})
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Empty },
      { path: '/mines', name: 'mines', component: MinesLobby },
      { path: '/mines/play', name: 'mines-play', component: Empty },
    ],
  })
  await router.push('/mines')
  const wrapper = mount(MinesLobby, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('MinesLobby', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
    settings.value.locale = 'en'
  })

  it('shows the rules first for new players and size and mines per difficulty', async () => {
    const { wrapper } = await mountLobby()
    expect(wrapper.find('.rules-card').exists()).toBe(true)
    expect(wrapper.find('.rules--bottom').exists()).toBe(false)
    expect(wrapper.findAll('.choice__detail').map((el) => el.text())).toEqual([
      '8×10 · 12 mines',
      '9×13 · 22 mines',
      '10×16 · 35 mines',
      '12×18 · 50 mines',
    ])
  })

  it('moves the rules below the list after playing and starts a difficulty', async () => {
    recordStart('mines', 'easy')
    const { wrapper, router } = await mountLobby()
    expect(wrapper.find('.rules--bottom').exists()).toBe(true)
    await wrapper.findAll('.choice')[3]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.new).toBe('expert')
  })
})
