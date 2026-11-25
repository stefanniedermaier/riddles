/**
 * Stack of open modal dialogs.
 *
 * - Escape closes only the topmost dialog (one document listener for all dialogs).
 * - Tab / Shift+Tab cycle inside the topmost dialog (focus trap).
 * - `dialogOpen` makes the page content `inert` while any dialog is open (see App.vue), so
 *   pointer, keyboard and screen readers cannot reach what is behind the scrim. Toasts and
 *   the update banner stay outside the inert part, so they are still announced.
 */
import { computed, shallowReactive } from 'vue'

export interface DialogEntry {
  /** The dialog panel (focus trap container). */
  panel: () => HTMLElement | null
  /** Called on Escape when this dialog is on top; the dialog decides whether to close. */
  onEscape: () => void
}

const stack = shallowReactive<DialogEntry[]>([])

/** True while at least one modal dialog is open. */
export const dialogOpen = computed(() => stack.length > 0)

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[inert], [hidden]'),
  )
}

function trapTab(event: KeyboardEvent, panel: HTMLElement): void {
  const items = focusableIn(panel)
  if (items.length === 0) {
    event.preventDefault()
    panel.focus()
    return
  }
  const first = items[0]!
  const last = items[items.length - 1]!
  const active = document.activeElement
  const inside = active instanceof Node && panel.contains(active)
  if (event.shiftKey && (!inside || active === first || active === panel)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (!inside || active === last)) {
    event.preventDefault()
    first.focus()
  }
}

function onKeydown(event: KeyboardEvent): void {
  const top = stack[stack.length - 1]
  if (!top) return
  if (event.key === 'Escape') {
    event.stopPropagation()
    top.onEscape()
  } else if (event.key === 'Tab') {
    const panel = top.panel()
    if (panel) trapTab(event, panel)
  }
}

/** Registers an opened dialog; returns a function that unregisters it. */
export function pushDialog(entry: DialogEntry): () => void {
  if (stack.length === 0) document.addEventListener('keydown', onKeydown, true)
  stack.push(entry)
  return () => {
    const index = stack.indexOf(entry)
    if (index >= 0) stack.splice(index, 1)
    if (stack.length === 0) document.removeEventListener('keydown', onKeydown, true)
  }
}
