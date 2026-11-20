/**
 * Stopwatch / countdown composables that pause automatically while the app is hidden
 * (switching apps, locking the phone) and resume when it becomes visible again.
 */
import { computed, getCurrentScope, onScopeDispose, readonly, ref } from 'vue'

const TICK_MS = 200

export function useStopwatch(initialMs = 0) {
  const elapsedMs = ref(initialMs)
  const running = ref(false)

  let baseMs = initialMs
  let startedAt = 0
  let interval: ReturnType<typeof setInterval> | undefined
  let pausedByVisibility = false

  function tick(): void {
    elapsedMs.value = baseMs + (performance.now() - startedAt)
  }

  function start(): void {
    if (running.value) return
    pausedByVisibility = false
    startedAt = performance.now()
    running.value = true
    interval = setInterval(tick, TICK_MS)
  }

  function pause(): void {
    if (!running.value) return
    tick()
    baseMs = elapsedMs.value
    running.value = false
    clearInterval(interval)
    interval = undefined
  }

  function reset(ms = 0): void {
    pause()
    pausedByVisibility = false
    baseMs = ms
    elapsedMs.value = ms
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
  const stopwatch = useStopwatch(elapsedInitialMs)
  const limitMs = ref(totalMs)
  let expired = false

  const remainingMs = computed(() => Math.max(0, limitMs.value - stopwatch.elapsedMs.value))

  const check = setInterval(() => {
    if (!expired && stopwatch.running.value && remainingMs.value <= 0) {
      expired = true
      stopwatch.pause()
      onExpire()
    }
  }, TICK_MS / 2)

  if (getCurrentScope()) onScopeDispose(() => clearInterval(check))

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
