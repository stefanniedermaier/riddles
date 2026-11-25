/**
 * Stopwatch / countdown composables that pause automatically while the app is hidden
 * (switching apps, locking the phone) and resume when it becomes visible again.
 */
import { computed, customRef, getCurrentScope, onScopeDispose, readonly, ref, watch } from 'vue'

const TICK_MS = 200

export interface StopwatchOptions {
  /**
   * How often readers are notified while running (default: every whole second). Reading
   * `elapsedMs` is always exact; this only decides how often a template re-renders.
   */
  stepMs?: number
}

export function useStopwatch(initialMs = 0, { stepMs = 1000 }: StopwatchOptions = {}) {
  const running = ref(false)

  let baseMs = initialMs
  let startedAt = 0
  let interval: ReturnType<typeof setInterval> | undefined
  let pausedByVisibility = false
  let lastStep = Math.floor(initialMs / stepMs)
  let notify = (): void => {}

  // Plain flag: reading the time must not make readers depend on `running` as well.
  let ticking = false
  const exact = (): number => (ticking ? baseMs + (performance.now() - startedAt) : baseMs)

  /** Exact on every read; dependents are only triggered when a new step is reached. */
  const elapsedMs = customRef<number>((track, trigger) => {
    notify = trigger
    return {
      get: () => {
        track()
        return exact()
      },
      set: () => {},
    }
  })

  function tick(): void {
    const step = Math.floor(exact() / stepMs)
    if (step === lastStep) return
    lastStep = step
    notify()
  }

  function start(): void {
    if (running.value) return
    pausedByVisibility = false
    startedAt = performance.now()
    ticking = true
    running.value = true
    interval = setInterval(tick, TICK_MS)
  }

  function pause(): void {
    if (!running.value) return
    baseMs = exact()
    ticking = false
    running.value = false
    clearInterval(interval)
    interval = undefined
    notify()
  }

  function reset(ms = 0): void {
    pause()
    pausedByVisibility = false
    baseMs = ms
    lastStep = Math.floor(ms / stepMs)
    notify()
  }

  function onVisibilityChange(): void {
    if (document.hidden) {
      if (running.value) {
        pause()
        pausedByVisibility = true
      }
    } else if (pausedByVisibility) {
      start()
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    })
  }

  return { elapsedMs: readonly(elapsedMs), running: readonly(running), start, pause, reset }
}

/**
 * Countdown built on the stopwatch. `onExpire` fires once when the remaining time hits 0.
 * Time can be extended with `addTime` (e.g. bonus seconds).
 */
export function useCountdown(totalMs: number, onExpire: () => void, elapsedInitialMs = 0) {
  // Finer steps than a stopwatch: the time bar moves smoothly.
  const stopwatch = useStopwatch(elapsedInitialMs, { stepMs: 100 })
  const limitMs = ref(totalMs)
  let expired = false

  const remainingMs = computed(() => Math.max(0, limitMs.value - stopwatch.elapsedMs.value))

  // The expiry check only runs while the clock runs (not while paused or hidden).
  let check: ReturnType<typeof setInterval> | undefined
  const stopWatching = watch(
    stopwatch.running,
    (running) => {
      clearInterval(check)
      check = undefined
      if (!running) return
      check = setInterval(() => {
        if (!expired && limitMs.value - stopwatch.elapsedMs.value <= 0) {
          expired = true
          stopwatch.pause()
          onExpire()
        }
      }, TICK_MS / 2)
    },
    { immediate: true, flush: 'sync' },
  )

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stopWatching()
      clearInterval(check)
    })
  }

  return {
    remainingMs,
    limitMs: readonly(limitMs),
    elapsedMs: stopwatch.elapsedMs,
    running: stopwatch.running,
    start: () => {
      if (!expired) stopwatch.start()
    },
    pause: stopwatch.pause,
    addTime: (ms: number) => {
      limitMs.value += ms
    },
    reset: (newTotalMs = totalMs, elapsedMs = 0) => {
      expired = false
      limitMs.value = newTotalMs
      stopwatch.reset(elapsedMs)
    },
  }
}
