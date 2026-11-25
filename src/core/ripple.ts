/**
 * Material ripple for the app's UI controls (buttons, cards, list rows, tabs, switches).
 *
 * One delegated `pointerdown` listener: when it hits one of the {@link RIPPLE_TARGETS}, a
 * circle grows from the pointer and fades out (styles in base.css, `.md-ripple`). Game
 * boards and pieces are not in the list – they have their own feedback. Off with reduced
 * motion. The state layer (hover / focus / pressed tint) is pure CSS on the same targets.
 */

/** UI controls that get a ripple; keep in sync with the state-layer list in base.css. */
export const RIPPLE_TARGETS = [
  '.app-btn',
  '.icon-btn',
  '.app-bar__icon-btn',
  '.dialog__close',
  '.choice',
  '.continue',
  '.game-card',
  '.segmented__option',
  '.rules-card__summary',
  '.order__hidden-summary',
  '.game-picker__item',
  '.toggle-row',
  '.pad__key',
  '.tool',
  '.hint__close',
  '.md-ripple-target',
].join(', ')

const RIPPLE_MS = 450

export function installRipple(): void {
  if (typeof document === 'undefined') return
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0 || document.documentElement.dataset.motion === 'reduced') return
      const target = (event.target as Element | null)?.closest<HTMLElement>(RIPPLE_TARGETS)
      if (!target || (target as HTMLButtonElement).disabled) return
      const rect = target.getBoundingClientRect()
      const size = Math.hypot(rect.width, rect.height) * 2
      const ripple = document.createElement('span')
      ripple.className = 'md-ripple'
      ripple.style.width = ripple.style.height = `${size}px`
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`
      target.appendChild(ripple)
      setTimeout(() => ripple.remove(), RIPPLE_MS + 100)
    },
    { passive: true },
  )
}
