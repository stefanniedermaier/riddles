import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, watchEffect } from 'vue'

import { useCountdown, useStopwatch } from '../timer'

describe('useStopwatch', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'performance'] }))
  afterEach(() => vi.useRealTimers())

  it('reads exactly but notifies once per second', () => {
    const scope = effectScope()
    scope.run(() => {
      const watch = useStopwatch(500)
      let renders = 0
      watchEffect(() => {
        void watch.elapsedMs.value
        renders++
      }, { flush: 'sync' })
      watch.start()
      vi.advanceTimersByTime(400)
      expect(watch.elapsedMs.value).toBeCloseTo(900, -1)
      expect(renders).toBe(1) // still within the first second
      vi.advanceTimersByTime(200)
      expect(renders).toBe(2) // 1.1 s
      vi.advanceTimersByTime(1000)
      expect(renders).toBe(3) // 2.1 s
      watch.pause()
      const paused = watch.elapsedMs.value
      vi.advanceTimersByTime(5000)
      expect(watch.elapsedMs.value).toBe(paused)
      watch.reset(0)
      expect(watch.elapsedMs.value).toBe(0)
    })
    scope.stop()
  })
})

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'performance'] }))
  afterEach(() => vi.useRealTimers())

  it('expires once, can be extended and does not tick while paused', () => {
    const scope = effectScope()
    scope.run(() => {
      const onExpire = vi.fn()
      const countdown = useCountdown(1000, onExpire)
      countdown.start()
      vi.advanceTimersByTime(500)
      countdown.addTime(1000)
      countdown.pause()
      vi.advanceTimersByTime(10_000)
      expect(onExpire).not.toHaveBeenCalled()
      countdown.start()
      vi.advanceTimersByTime(1400)
      expect(onExpire).not.toHaveBeenCalled()
      vi.advanceTimersByTime(300)
      expect(onExpire).toHaveBeenCalledTimes(1)
      expect(countdown.remainingMs.value).toBe(0)
      expect(countdown.running.value).toBe(false)
    })
    scope.stop()
  })
})
