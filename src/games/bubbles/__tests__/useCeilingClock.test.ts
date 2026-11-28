import { effectScope } from 'vue'
import { describe, expect, it } from 'vitest'

import { useCeilingClock } from '../useCeilingClock'

function setup() {
  const callbacks: FrameRequestCallback[] = []
  const ticks: number[] = []
  const scope = effectScope()
  const clock = scope.run(() =>
    useCeilingClock({
      tick: (ms) => ticks.push(ms),
      frame: (callback) => callbacks.push(callback),
      cancelFrame: () => {
        callbacks.length = 0
      },
    }),
  )!
  let now = 1000
  const frame = (ms: number) => {
    now += ms
    for (const callback of callbacks.splice(0)) callback(now)
  }
  return { clock, ticks, frame, scope }
}

describe('useCeilingClock', () => {
  it('reports the time between frames while it runs', () => {
    const { clock, ticks, frame } = setup()
    frame(16)
    expect(ticks).toEqual([])
    clock.start()
    frame(16) // first frame only sets the start
    frame(16)
    frame(20)
    expect(ticks).toEqual([16, 20])
  })

  it('caps long frames and stops on pause', () => {
    const { clock, ticks, frame, scope } = setup()
    clock.start()
    frame(16)
    frame(5000)
    expect(ticks).toEqual([250])
    clock.pause()
    expect(clock.running.value).toBe(false)
    frame(16)
    expect(ticks).toEqual([250])
    // After a pause the gap is not counted.
    clock.start()
    frame(3000)
    frame(16)
    expect(ticks).toEqual([250, 16])
    scope.stop()
    expect(clock.running.value).toBe(false)
  })
})
