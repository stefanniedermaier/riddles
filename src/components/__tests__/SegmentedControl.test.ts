import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SegmentedControl from '../SegmentedControl.vue'

const options = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C' },
] as const

describe('SegmentedControl', () => {
  it('is one tab stop and chooses with the arrow keys', async () => {
    const wrapper = mount(SegmentedControl, {
      props: {
        options,
        modelValue: 'a',
        'onUpdate:modelValue': (value: string) => wrapper.setProps({ modelValue: value }),
      },
      attachTo: document.body,
    })
    const radios = () => wrapper.findAll('[role="radio"]')
    expect(radios().map((r) => r.attributes('tabindex'))).toEqual(['0', '-1', '-1'])

    await radios()[0]!.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.props('modelValue')).toBe('c')
    expect(document.activeElement).toBe(radios()[2]!.element)
    expect(radios().map((r) => r.attributes('tabindex'))).toEqual(['-1', '-1', '0'])

    await radios()[2]!.trigger('keydown', { key: 'Home' })
    expect(wrapper.props('modelValue')).toBe('a')
    wrapper.unmount()
  })
})
