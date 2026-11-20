import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { recordStart, resetStats } from '@/core/stats'
import NonogramLobby from '../NonogramLobby.vue'

async function mountLobby() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/nonogram', name: 'nonogram', component: NonogramLobby },
      { path: '/nonogram/play', name: 'nonogram-play', component: { template: '<div />' } },
    ],
  })
  await router.push('/nonogram')
  return { router, wrapper: mount(NonogramLobby, { global: { plugins: [router] } }) }
}

describe('NonogramLobby', () => {
  beforeEach(() => {
    localStorage.clear()
    resetStats()
    settings.value.locale = 'en'
  })

  it('lists the difficulties with sizes and shows the rules first for new players', async () => {
    const { wrapper } = await mountLobby()
    expect(wrapper.findAll('.choice')).toHaveLength(4)
    expect(wrapper.text()).toContain('5×5')
    expect(wrapper.text()).toContain('15×20')
    expect(wrapper.find('.rules--bottom').exists()).toBe(false)
  })

  it('moves the rules below the list once a game was played', async () => {
    recordStart('nonogram', 'easy')
    const { wrapper } = await mountLobby()
    expect(wrapper.find('.rules--bottom').exists()).toBe(true)
  })

  it('starts a new game for the chosen difficulty', async () => {
    const { router, wrapper } = await mountLobby()
    await wrapper.findAll('.choice')[3]!.trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(router.currentRoute.value.fullPath).toBe('/nonogram/play?new=expert')
  })
})
