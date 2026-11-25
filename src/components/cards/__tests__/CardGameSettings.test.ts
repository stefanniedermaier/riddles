import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { settings as appSettings } from '@/core/settings'
import { settings } from '@/games/freecell/game'
import FreeCellSettings from '@/games/freecell/FreeCellSettings.vue'

describe('card game settings', () => {
  it('switches scoring and toggles options', async () => {
    appSettings.value.locale = 'en'
    settings.value = { scoring: 'time', solvable: true, tapAuto: true, fourColor: false, autoFoundation: true }
    const wrapper = mount(FreeCellSettings)
    await wrapper.findAll('[role="radio"]').find((b) => b.text() === 'Points')!.trigger('click')
    expect(settings.value.scoring).toBe('points')
    const switches = wrapper.findAll('input[role="switch"]')
    expect(switches).toHaveLength(4)
    await switches[3]!.setValue(true) // four-colour suits
    expect(settings.value.fourColor).toBe(true)
  })
})
