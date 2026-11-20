import type { RouteLocationRaw, Router } from 'vue-router'

/**
 * Returns to `target` without piling up history entries: if the previous history entry
 * already is `target`, go back to it; otherwise replace the current entry.
 *
 * Using `router.replace(target)` alone would leave the history as `… → target → target`,
 * so the next "back" tap would seemingly do nothing.
 */
export function returnTo(router: Router, target: RouteLocationRaw): Promise<unknown> {
  const previous: unknown = typeof window !== 'undefined' ? window.history.state?.back : null
  if (typeof previous === 'string' && previous === router.resolve(target).fullPath) {
    router.back()
    return Promise.resolve()
  }
  return router.replace(target)
}
