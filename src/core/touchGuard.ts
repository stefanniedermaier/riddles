/**
 * Counts the fingers on a game board, so a two-finger gesture (a pinch to zoom in – common
 * with low vision) never counts as a move: only a touch with one finger plays.
 *
 * - `down` on every pointerdown: `false` once a second finger is on the board – the board
 *   then cancels what the first finger started and ignores input until every finger is up;
 * - `up` on pointerup / pointercancel;
 * - a primary pointer starts a new touch and resets the count (also when a finger was
 *   lifted outside the board, where its pointerup never arrived).
 *
 * Mouse and pen are a single pointer and always pass.
 */
export interface TouchGuard {
  /** Registers a pointer; `false` while more than one finger is down. */
  down(event: PointerEvent): boolean
  /** Unregisters a pointer (pointerup / pointercancel). */
  up(event: PointerEvent): void
  /** More than one finger is (or was, until all are lifted) on the board. */
  readonly multi: boolean
}

export function createTouchGuard(): TouchGuard {
  const active = new Set<number>()
  let multi = false
  return {
    down(event) {
      if (event.isPrimary) {
        active.clear()
        multi = false
      }
      active.add(event.pointerId)
      if (active.size > 1) multi = true
      return !multi
    },
    up(event) {
      active.delete(event.pointerId)
      if (active.size === 0) multi = false
    },
    get multi() {
      return multi
    },
  }
}
