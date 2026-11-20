import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { recordStart, resetStats } from '@/core/stats'
import ArrowsLobby from '../ArrowsLobby.vue'
import { arrowsPool } from '../pool'

const Empty = { template: '<div />' }

async function mountLobby() {
  vi.spyOn(arrowsPool, 'warm').mockImplementation(() => {})
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Empty },
      { path: '/arrows', name: 'arrows', component: ArrowsLobby },
      { path: '/arrows/play', name: 'arrows-play', component: Empty },
    ],
  })
  await router.push('/arrows')
  const wrapper = mount(ArrowsLobby, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('ArrowsLobby', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
    settings.value.locale = 'en'
  })

  it('shows the rules first for new players and the sizes per difficulty', async () => {
    const { wrapper } = await mountLobby()
    expect(wrapper.find('.rules').exists()).toBe(true)
    expect(wrapper.find('.rules--bottom').exists()).toBe(false)
    expect(wrapper.findAll('.choice__detail').map((el) => el.text())).toEqual(['6×6', '8×8', '10×10', '12×12'])
  })

  it('moves the rules below the list after playing and starts a difficulty', async () => {
    recordStart('arrows', 'easy')
    const { wrapper, router } = await mountLobby()
    expect(wrapper.find('.rules--bottom').exists()).toBe(true)
    await wrapper.findAll('.choice')[2]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.new).toBe('hard')
  })
})
