import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import HomeView from '../HomeView.vue'

describe('HomeView', () => {
  it('shows one card per game', async () => {
    settings.value.locale = 'en'
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: HomeView }],
    })
    await router.push('/')
    const wrapper = mount(HomeView, { global: { plugins: [router] } })
    const cards = wrapper.findAll('.game-card')
    expect(cards).toHaveLength(5)
    expect(wrapper.text()).toContain('Sudoku')
    expect(wrapper.text()).toContain('Crowns')
    expect(wrapper.text()).toContain('Links')
    expect(wrapper.text()).toContain('Shapes')
  })
})
