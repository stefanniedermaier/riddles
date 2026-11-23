import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { recordStart, resetStats } from '@/core/stats'
import LinksLobby from '../LinksLobby.vue'

async function mountLobby() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/links', name: 'links', component: LinksLobby },
      { path: '/links/play', name: 'links-play', component: { template: '<div />' } },
    ],
  })
  await router.push('/links')
  return { router, wrapper: mount(LinksLobby, { global: { plugins: [router] } }) }
}

describe('LinksLobby', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
    settings.value.locale = 'en'
  })

  it('lists the difficulties with sizes and shows the rules first for new players', async () => {
    const { wrapper } = await mountLobby()
    expect(wrapper.findAll('.choice')).toHaveLength(4)
    expect(wrapper.text()).toContain('11×11')
    expect(wrapper.find('.rules-card').exists()).toBe(true)
    // Collapsed by default.
    expect(wrapper.find('.rules-card').attributes('open')).toBeUndefined()
    expect(wrapper.find('.rules--bottom').exists()).toBe(false)
  })

  it('moves the rules below the list once a game was played', async () => {
    recordStart('links', 'easy')
    const { wrapper } = await mountLobby()
    expect(wrapper.find('.rules--bottom').exists()).toBe(true)
  })

  it('starts a new game for the chosen difficulty', async () => {
    const { router, wrapper } = await mountLobby()
    await wrapper.findAll('.choice')[2]!.trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(router.currentRoute.value.fullPath).toBe('/links/play?new=hard')
  })
})
