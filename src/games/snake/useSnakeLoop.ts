/**
 * The real-time loop of Snake: one `requestAnimationFrame` loop with a fixed step. Time
 * accumulates frame by frame and `step` runs whenever a whole step interval has passed, so
 * the snake keeps the same speed at any frame rate (and `setInterval` drift or a busy frame
 * never change it). Between steps `progress` (0…1) tells the board how far the snake is
 * on its way to the next cell.
 *
 * Turns are queued (at most two between steps), so a quick "up, left" is not lost; a turn
 * that does not change the direction of the last queued one is dropped.
 */
import { onScopeDispose, readonly, ref } from 'vue'

import { isTurn } from './logic/engine'
import type { Direction } from './logic/types'

/** A long frame (tab in the background, debugger) counts as this at most. */
const MAX_FRAME_MS = 250
const MAX_QUEUE = 2

export interface SnakeLoopOptions {
  /** Current time between two steps (ms). */
  interval: () => number
  /** Current direction of the snake (to validate queued turns). */
  direction: () => Direction
  /** Runs one step with the next queued turn; return `false` when the run is over. */
  step: (turn: Direction | undefined) => boolean
  /** Injectable for tests. */
  frame?: (callback: FrameRequestCallback) => number
  cancelFrame?: (handle: number) => void
}

export function useSnakeLoop(options: SnakeLoopOptions) {
  const frame = options.frame ?? ((callback) => requestAnimationFrame(callback))
  const cancelFrame = options.cancelFrame ?? ((handle) => cancelAnimationFrame(handle))

  const running = ref(false)
  /** How far the snake is between the last step and the next (1 at rest). */
  const progress = ref(1)

  const queue: Direction[] = []
  let handle = 0
  let last = 0
  let elapsed = 0
  /** No step since the last start: the board shows the snake at rest. */
  let fresh = true

  function tick(now: number): void {
    if (!running.value) return
    elapsed += Math.min(Math.max(0, now - last), MAX_FRAME_MS)
    last = now
    let interval = options.interval()
    while (elapsed >= interval) {
      elapsed -= interval
      fresh = false
      if (!options.step(queue.shift())) {
        stop()
        progress.value = 1
        return
      }
      interval = options.interval()
    }
    progress.value = fresh ? 1 : Math.min(1, elapsed / interval)
    handle = frame(tick)
  }

  function start(): void {
    if (running.value) return
    running.value = true
    elapsed = 0
    fresh = true
    handle = frame((now) => {
      last = now
      tick(now)
    })
  }

  function stop(): void {
    running.value = false
    cancelFrame(handle)
  }

  /** Pauses; the snake stays where it is (drawn at rest). */
  function pause(): void {
    stop()
    progress.value = 1
  }

  /** Queues a turn; `false` when it was dropped. */
  function turn(direction: Direction): boolean {
    const heading = queue.at(-1) ?? options.direction()
    if (queue.length >= MAX_QUEUE || !isTurn(heading, direction)) return false
    queue.push(direction)
    return true
  }

  function clear(): void {
    queue.length = 0
  }

  onScopeDispose(stop)

  return { running: readonly(running), progress: readonly(progress), start, pause, turn, clear }
}
