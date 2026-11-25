import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppButton from '../AppButton.vue'

const sources = import.meta.glob<string>('/src/**/*.vue', { query: '?raw', import: 'default', eager: true })

describe('AppButton', () => {
  it('names an icon-only button by its label', () => {
    const wrapper = mount(AppButton, { props: { icon: 'close', label: 'Close' } })
    expect(wrapper.attributes('aria-label')).toBe('Close')
    expect(wrapper.attributes('title')).toBe('Close')
  })

  it('has a label on every icon-only use in the app', () => {
    const uses = Object.entries(sources).filter(([file]) => !file.endsWith('/AppButton.vue'))
    const missing = uses.flatMap(([file, source]) =>
      [...source.matchAll(/<AppButton\b([^>]*?)\/>/gs)]
        .filter(([, attrs]) => !/\s:?label=/.test(attrs ?? ''))
        .map(([tag]) => `${file}: ${tag.replace(/\s+/g, ' ')}`),
    )
    expect(missing).toEqual([])
  })
})
