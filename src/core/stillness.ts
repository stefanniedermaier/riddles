/**
 * "Still" mode for decorative, endless animations (drifting clouds, butterflies, burning
 * fuses …): `<html data-still>` is set while a dialog is open or after a while without input.
 * Components pause such animations with
 *
 *   :root[data-still] .decoration { animation-play-state: paused; }
 *
 * so an idle screen stops repainting and saves battery. Feedback animations (hint pulse,
 * selection) are not decorative and keep running.
 */
import { ref, watchEffect } from 'vue'

import { dialogOpen } from './dialogs'

/** No input for this long counts as idle. */
export const IDLE_MS = 15_000

/** True after `IDLE_MS` without pointer, key or wheel input. */
const userIdle = ref(false)

let installed = false

export function installStillness(target: Document = document): void {
  if (installed) return
  installed = true
  let timer: ReturnType<typeof setTimeout> | undefined
  const wake = (): void => {
    userIdle.value = false
    clearTimeout(timer)
    timer = setTimeout(() => (userIdle.value = true), IDLE_MS)
  }
  for (const type of ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const) {
    target.addEventListener(type, wake, { passive: true, capture: true })
  }
  target.addEventListener('visibilitychange', () => {
    if (!target.hidden) wake()
  })
  wake()
  watchEffect(() => {
    target.documentElement.toggleAttribute('data-still', dialogOpen.value || userIdle.value)
  })
}
