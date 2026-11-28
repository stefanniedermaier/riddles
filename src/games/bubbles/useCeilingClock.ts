/**
 * The clock of the time mode: a `requestAnimationFrame` loop that reports the time passed,
 * frame by frame, while it runs. A long frame (tab in the background, debugger) counts as
 * `MAX_FRAME_MS` at most, so the ceiling never jumps several rows at once. The play view
 * pauses it whenever the game must not go on (hidden page, dialog, second finger, a shot
 * in flight does not pause it).
 */
import { onScopeDispose, readonly, ref } from 'vue'

const MAX_FRAME_MS = 250

export interface CeilingClockOptions {
  /** Called every frame with the ms since the previous frame. */
  tick: (ms: number) => void
  /** Injectable for tests. */
  frame?: (callback: FrameRequestCallback) => number
  cancelFrame?: (handle: number) => void
}

export function useCeilingClock(options: CeilingClockOptions) {
  const frame = options.frame ?? ((callback) => requestAnimationFrame(callback))
  const cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle))

  const running = ref(false)
  let handle = 0
  let last: number | null = null

  function loop(now: number): void {
    if (!running.value) return
    if (last !== null) options.tick(Math.min(Math.max(0, now - last), MAX_FRAME_MS))
    last = now
    if (running.value) handle = frame(loop)
  }

  function start(): void {
    if (running.value) return
    running.value = true
    last = null
    handle = frame(loop)
  }

  function pause(): void {
    running.value = false
    cancelFrame(handle)
  }

  onScopeDispose(pause)

  return { running: readonly(running), start, pause }
}
