import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { gameLayout, normalizeLayout } from '@/games/layout'
import HomeView from '../HomeView.vue'
import { gameRoutes, games } from '@/games/registry'

describe('HomeView', () => {
  it('shows one card per game', async () => {
    settings.value.locale = 'en'
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: HomeView }, ...gameRoutes],
    })
    await router.push('/')
    const wrapper = mount(HomeView, { global: { plugins: [router] } })
    const cards = wrapper.findAll('.game-card')
    expect(cards).toHaveLength(games.length)
    expect(wrapper.text()).toContain('Sudoku')
    expect(wrapper.text()).toContain('Stars')
    expect(wrapper.text()).toContain('Links')
    expect(wrapper.text()).toContain('Shapes')
    // Real paths; Stars lives at /stars (its id is still `crowns`).
    expect(wrapper.find('a[href="/sudoku"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/stars"]').exists()).toBe(true)
  })

  it('follows the order and visibility from the settings', async () => {
    settings.value.locale = 'en'
    gameLayout.value = normalizeLayout({ order: ['shapes', 'links'], disabled: ['crowns'] })
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: HomeView }, ...gameRoutes] })
    await router.push('/')
    const wrapper = mount(HomeView, { global: { plugins: [router] } })
    const titles = wrapper.findAll('.game-card__name').map((el) => el.text())
    expect(titles).toEqual(['Shapes', 'Links', 'Sudoku', 'Nonogram', 'Arrows', 'Merge', 'Blocks', 'Snake', 'Bubbles', 'Mines', 'Pipes', 'Water Sort', 'Code Breaker', 'Solitaire', 'Spider', 'FreeCell', 'TriPeaks'])
    gameLayout.value = normalizeLayout(null)
  })
})
