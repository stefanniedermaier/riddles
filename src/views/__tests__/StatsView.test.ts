import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { settings } from '@/core/settings'
import { recordFinish, recordStart, resetStats } from '@/core/stats'
import StatsView from '../StatsView.vue'

describe('StatsView', () => {
  it('shows best time and high score for card games', async () => {
    settings.value.locale = 'en'
    resetStats()
    recordStart('solitaire', 'draw1')
    recordFinish('solitaire', 'draw1', { timeMs: 125_000, score: 1234 })
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: StatsView }] })
    await router.push('/')
    const wrapper = mount(StatsView, { global: { plugins: [router] } })
    const section = wrapper.findAll('.game').find((s) => s.text().includes('Solitaire'))!
    expect(section.findAll('th').map((th) => th.text())).toContain('High score')
    expect(section.text()).toContain('2:05')
    expect(section.text()).toMatch(/1[,.]?234/)
    resetStats()
  })
})
