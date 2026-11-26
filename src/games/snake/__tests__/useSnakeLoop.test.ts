import { effectScope } from 'vue'
import { describe, expect, it } from 'vitest'

import type { Direction } from '../logic/types'
import { useSnakeLoop } from '../useSnakeLoop'

/** A loop with a manual frame clock. */
function setup(interval = 100, steps = Infinity) {
  const callbacks: FrameRequestCallback[] = []
  const turns: (Direction | undefined)[] = []
  let direction: Direction = 'right'
  const scope = effectScope()
  const loop = scope.run(() =>
    useSnakeLoop({
      interval: () => interval,
      direction: () => direction,
      step: (turn) => {
        turns.push(turn)
        if (turn) direction = turn
        return turns.length < steps
      },
      frame: (callback) => callbacks.push(callback),
      cancelFrame: () => {
        callbacks.length = 0
      },
    }),
  )!
  let now = 1000
  /** Runs frames of `ms` each until `total` ms have passed. */
  const advance = (total: number, ms = 16) => {
    for (let t = 0; t < total; t += ms) {
      now += ms
      const pending = callbacks.splice(0)
      for (const callback of pending) callback(now)
    }
  }
  return { loop, turns, advance, scope, frames: callbacks }
}

describe('useSnakeLoop', () => {
  it('steps at a fixed interval, independent of the frame rate', () => {
    const fast = setup(100)
    fast.loop.start()
    fast.advance(16) // first frame sets the clock
    fast.advance(1000, 8)
    const slow = setup(100)
    slow.loop.start()
    slow.advance(16)
    slow.advance(1000, 50)
    expect(fast.turns).toHaveLength(10)
    expect(slow.turns).toHaveLength(10)
  })

  it('reports the progress between steps, and 1 at rest', () => {
    const { loop, advance } = setup(100)
    expect(loop.progress.value).toBe(1)
    loop.start()
    advance(16)
    advance(48) // no step yet: at rest
    expect(loop.progress.value).toBe(1)
    advance(96) // one step, then part of the next interval
    expect(loop.progress.value).toBeGreaterThan(0)
    expect(loop.progress.value).toBeLessThan(1)
    loop.pause()
    expect(loop.progress.value).toBe(1)
  })

  it('queues up to two turns and drops turns that change nothing', () => {
    const { loop, advance, turns } = setup(100)
    expect(loop.turn('left')).toBe(false) // back into the snake
    expect(loop.turn('right')).toBe(false) // same direction
    expect(loop.turn('up')).toBe(true)
    expect(loop.turn('down')).toBe(false) // opposite of the queued turn
    expect(loop.turn('left')).toBe(true)
    expect(loop.turn('down')).toBe(false) // queue full
    loop.start()
    advance(16)
    advance(304)
    expect(turns).toEqual(['up', 'left', undefined])
  })

  it('stops when the run is over and when paused', () => {
    const over = setup(100, 2)
    over.loop.start()
    over.advance(16)
    over.advance(1000)
    expect(over.turns).toHaveLength(2)
    expect(over.loop.running.value).toBe(false)

    const paused = setup(100)
    paused.loop.start()
    paused.advance(16)
    paused.advance(250)
    paused.loop.pause()
    paused.advance(1000)
    expect(paused.turns).toHaveLength(2)
  })

  it('counts a long frame (app in the background) as a short one', () => {
    const { loop, advance, turns } = setup(100)
    loop.start()
    advance(16)
    advance(5000, 5000)
    expect(turns.length).toBeLessThanOrEqual(3)
  })

  it('stops with its scope', () => {
    const { loop, scope, frames, advance } = setup(100)
    loop.start()
    advance(16)
    scope.stop()
    expect(frames).toHaveLength(0)
  })
})
