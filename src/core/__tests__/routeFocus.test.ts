import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

import { installRouteFocus, pageTitle } from '../routeFocus'

const page = (title: string) => defineComponent({ render: () => h('h1', title) })

describe('route focus', () => {
  it('titles the page after its heading', () => {
    expect(pageTitle('Riddles')).toBe('Riddles')
    expect(pageTitle('')).toBe('Riddles')
    expect(pageTitle('Settings')).toBe('Settings – Riddles')
  })

  it('focuses the new heading after a navigation, not on the first load', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: page('Riddles') },
        { path: '/settings', component: page('Settings') },
      ],
    })
    installRouteFocus(router)
    const wrapper = mount(RouterView, { global: { plugins: [router] }, attachTo: document.body })
    await router.push('/')
    await router.isReady()
    await new Promise((resolve) => setTimeout(resolve))
    expect(document.title).toBe('Riddles')
    expect(document.activeElement).toBe(document.body)

    await router.push('/settings')
    await new Promise((resolve) => setTimeout(resolve))
    expect(document.title).toBe('Settings – Riddles')
    expect(document.activeElement?.textContent).toBe('Settings')

    // A query change stays on the page and leaves focus alone.
    const button = document.body.appendChild(document.createElement('button'))
    button.focus()
    await router.push('/settings?new=1')
    await new Promise((resolve) => setTimeout(resolve))
    expect(document.activeElement).toBe(button)
    button.remove()
    wrapper.unmount()
  })
})
