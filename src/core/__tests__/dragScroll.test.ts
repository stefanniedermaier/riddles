import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import { useDragScroll } from '../dragScroll'

/** A strip 100 px wide with 400 px of content. */
async function mountStrip(onItemClick = vi.fn()) {
  const Strip = defineComponent({
    setup() {
      const el = ref<HTMLElement | null>(null)
      useDragScroll(el)
      return () => h('div', { ref: el, class: 'strip' }, [h('button', { onClick: onItemClick }, 'item')])
    },
  })
  const wrapper = mount(Strip, { attachTo: document.body })
  await nextTick() // the listeners attach after the element is rendered
  const strip = wrapper.find('.strip').element as HTMLElement
  Object.defineProperty(strip, 'clientWidth', { value: 100 })
  Object.defineProperty(strip, 'scrollWidth', { value: 400 })
  return { wrapper, strip, onItemClick }
}

const pointer = (type: string, clientX: number, extra: Partial<PointerEventInit> = {}) =>
  new PointerEvent(type, { clientX, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, ...extra })

describe('useDragScroll', () => {
  it('scrolls sideways with a vertical wheel until the end, then lets the page scroll', async () => {
    const { wrapper, strip } = await mountStrip()
    const wheel = new WheelEvent('wheel', { deltaY: 120, cancelable: true })
    strip.dispatchEvent(wheel)
    expect(strip.scrollLeft).toBe(120)
    expect(wheel.defaultPrevented).toBe(true)

    strip.scrollLeft = 300 // at the end
    const atEnd = new WheelEvent('wheel', { deltaY: 120, cancelable: true })
    strip.dispatchEvent(atEnd)
    expect(atEnd.defaultPrevented).toBe(false)

    const sideways = new WheelEvent('wheel', { deltaX: 50, deltaY: 10, cancelable: true })
    strip.dispatchEvent(sideways)
    expect(sideways.defaultPrevented).toBe(false)
    wrapper.unmount()
  })

  it('drags with the mouse and swallows the click that ends a drag', async () => {
    const { wrapper, strip, onItemClick } = await mountStrip()
    strip.scrollLeft = 100
    const button = strip.querySelector('button')!
    button.dispatchEvent(pointer('pointerdown', 200))
    button.dispatchEvent(pointer('pointermove', 150))
    expect(strip.scrollLeft).toBe(150)
    expect(strip.classList.contains('drag-scrolling')).toBe(true)
    button.dispatchEvent(pointer('pointerup', 150))
    button.click()
    expect(onItemClick).not.toHaveBeenCalled()
    expect(strip.classList.contains('drag-scrolling')).toBe(false)

    // A press without movement stays a click.
    button.dispatchEvent(pointer('pointerdown', 150))
    button.dispatchEvent(pointer('pointermove', 152))
    button.dispatchEvent(pointer('pointerup', 152))
    button.click()
    expect(onItemClick).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('leaves touch input to the browser', async () => {
    const { wrapper, strip } = await mountStrip()
    strip.dispatchEvent(pointer('pointerdown', 200, { pointerType: 'touch' }))
    strip.dispatchEvent(pointer('pointermove', 100, { pointerType: 'touch' }))
    expect(strip.scrollLeft).toBe(0)
    wrapper.unmount()
  })
})
