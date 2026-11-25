/**
 * Makes a horizontally scrolling strip usable with a mouse (touch already scrolls natively):
 *
 * - the vertical mouse wheel scrolls it sideways (until its end – then the page scrolls on),
 * - it can be dragged with the mouse; a drag does not count as a click on the item under it.
 */
import { onBeforeUnmount, watch, type Ref } from 'vue'

/** Pointer movement (px) after which a press becomes a drag instead of a click. */
const DRAG_THRESHOLD = 5

export function useDragScroll(target: Ref<HTMLElement | null>): void {
  let el: HTMLElement | null = null
  let press: { pointerId: number; x: number; scrollLeft: number; dragging: boolean } | null = null
  /** Swallow the click that ends a drag. */
  let suppressClick = false

  function onWheel(event: WheelEvent): void {
    if (!el || event.ctrlKey) return
    // Only a mainly vertical wheel; trackpads already scroll sideways by themselves.
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    const max = el.scrollWidth - el.clientWidth
    if (max <= 0) return
    const atStart = el.scrollLeft <= 0 && event.deltaY < 0
    const atEnd = el.scrollLeft >= max - 1 && event.deltaY > 0
    if (atStart || atEnd) return
    // Wheel "lines" (Firefox) are about 16 px.
    el.scrollLeft += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
    event.preventDefault()
  }

  function onPointerDown(event: PointerEvent): void {
    if (!el || event.pointerType !== 'mouse' || event.button !== 0) return
    press = { pointerId: event.pointerId, x: event.clientX, scrollLeft: el.scrollLeft, dragging: false }
  }

  function onPointerMove(event: PointerEvent): void {
    if (!el || !press || event.pointerId !== press.pointerId) return
    const dx = event.clientX - press.x
    if (!press.dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return
      press.dragging = true
      el.setPointerCapture?.(event.pointerId)
      el.classList.add('drag-scrolling')
    }
    el.scrollLeft = press.scrollLeft - dx
  }

  function onPointerUp(event: PointerEvent): void {
    if (!el || !press || event.pointerId !== press.pointerId) return
    if (press.dragging) {
      suppressClick = true
      // The click (if any) follows right away; reset in case none comes.
      setTimeout(() => (suppressClick = false), 0)
      el.classList.remove('drag-scrolling')
    }
    press = null
  }

  function onClick(event: MouseEvent): void {
    if (!suppressClick) return
    suppressClick = false
    event.preventDefault()
    event.stopPropagation()
  }

  function attach(next: HTMLElement): void {
    el = next
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.addEventListener('click', onClick, true)
  }

  function detach(): void {
    if (!el) return
    el.removeEventListener('wheel', onWheel)
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerUp)
    el.removeEventListener('click', onClick, true)
    el.classList.remove('drag-scrolling')
    el = null
    press = null
  }

  watch(
    target,
    (next) => {
      detach()
      if (next) attach(next)
    },
    { immediate: true, flush: 'post' },
  )
  onBeforeUnmount(detach)
}
