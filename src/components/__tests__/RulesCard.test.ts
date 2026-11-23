import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import RulesCard from '../RulesCard.vue'

describe('RulesCard', () => {
  it('is collapsed by default and shows the title in the summary', () => {
    const wrapper = mount(RulesCard, {
      props: { title: 'How to play' },
      slots: { default: '<p class="body">Rules text</p>' },
    })
    const details = wrapper.find('details')
    expect(details.attributes('open')).toBeUndefined()
    expect(wrapper.find('summary').text()).toContain('How to play')
    // Content is in the DOM (for search and screen readers) but hidden until opened.
    expect(wrapper.find('.body').exists()).toBe(true)
  })

  it('opens when the summary is toggled', async () => {
    const wrapper = mount(RulesCard, { props: { title: 'Rules' }, slots: { default: 'x' } })
    const details = wrapper.find('details').element as HTMLDetailsElement
    details.open = true
    await wrapper.vm.$nextTick()
    expect(details.hasAttribute('open')).toBe(true)
  })
})
