import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'

import { dialogOpen } from '@/core/dialogs'
import AppDialog from '../AppDialog.vue'
import ConfirmDialog from '../ConfirmDialog.vue'

const dialogs = () => Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'))
const press = (key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  ;(document.activeElement ?? document.body).dispatchEvent(event)
  return event
}

describe('AppDialog', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('is named by its title, or by the label when it has none', async () => {
    const titled = mount(AppDialog, { props: { open: true, title: 'Rules' }, attachTo: document.body })
    await nextTick()
    const [dialog] = dialogs()
    const heading = dialog!.querySelector('h2')!
    expect(dialog!.getAttribute('aria-labelledby')).toBe(heading.id)
    expect(heading.textContent).toBe('Rules')
    titled.unmount()

    const untitled = mount(AppDialog, { props: { open: true, label: 'Solved!' }, attachTo: document.body })
    await nextTick()
    expect(dialogs()[0]!.getAttribute('aria-label')).toBe('Solved!')
    expect(dialogs()[0]!.querySelector('h2')).toBeNull()
    untitled.unmount()
  })

  it('names untitled confirm dialogs by their message', async () => {
    const wrapper = mount(ConfirmDialog, { props: { open: true, message: 'Start over?' }, attachTo: document.body })
    await nextTick()
    expect(dialogs()[0]!.getAttribute('aria-label')).toBe('Start over?')
    wrapper.unmount()
  })

  it('keeps Tab inside the dialog', async () => {
    const wrapper = mount(AppDialog, {
      props: { open: true, title: 'Trap' },
      slots: { actions: '<button class="a">A</button><button class="b">B</button>' },
      attachTo: document.body,
    })
    await nextTick()
    await nextTick()
    const panel = dialogs()[0]!
    const close = panel.querySelector<HTMLElement>('.dialog__close')!
    const last = panel.querySelector<HTMLElement>('.b')!
    last.focus()
    expect(press('Tab').defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(close)
    expect(press('Tab', { shiftKey: true }).defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(last)
    wrapper.unmount()
  })

  it('closes only the topmost dialog on Escape and tracks open dialogs', async () => {
    const closed: string[] = []
    const Host = defineComponent({
      components: { AppDialog },
      setup() {
        const outer = ref(true)
        const inner = ref(false)
        return { outer, inner, closed }
      },
      template: `
        <AppDialog :open="outer" title="Outer" @close="closed.push('outer'); outer = false" />
        <AppDialog :open="inner" title="Inner" @close="closed.push('inner'); inner = false" />
      `,
    })
    const wrapper = mount(Host, { attachTo: document.body })
    await nextTick()
    expect(dialogOpen.value).toBe(true)
    ;(wrapper.vm as unknown as { inner: boolean }).inner = true
    await nextTick()
    await nextTick()

    press('Escape')
    await nextTick()
    expect(closed).toEqual(['inner'])
    press('Escape')
    await nextTick()
    expect(closed).toEqual(['inner', 'outer'])
    expect(dialogOpen.value).toBe(false)
    wrapper.unmount()
  })

  it('gives focus back to the element that opened it', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const wrapper = mount(AppDialog, { props: { open: true, title: 'X' }, attachTo: document.body })
    await nextTick()
    await nextTick()
    expect(document.activeElement).not.toBe(opener)
    await wrapper.setProps({ open: false })
    await nextTick()
    await nextTick()
    expect(document.activeElement).toBe(opener)
    wrapper.unmount()
  })

  it('ignores Escape when not dismissible', async () => {
    const wrapper = mount(AppDialog, { props: { open: true, dismissible: false }, attachTo: document.body })
    await nextTick()
    press('Escape')
    expect(wrapper.emitted('close')).toBeUndefined()
    wrapper.unmount()
    expect(dialogOpen.value).toBe(false)
  })
})
