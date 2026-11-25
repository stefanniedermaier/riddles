/**
 * Screen orientation.
 *
 * The web app manifest does **not** lock the orientation: many Android browsers do not let an
 * installed app lift a manifest lock again (`screen.orientation.lock('any')` is refused), so
 * the card games – which have a landscape layout – could never rotate. Instead the app asks
 * for portrait at start-up (`preferPortrait`) and the card games allow any orientation while
 * they are open. Where locking is not allowed (most browser tabs, iOS, some installed apps)
 * every view simply follows the device; all views work in landscape too.
 */
interface Lockable {
  lock?: (orientation: string) => Promise<void>
  unlock?: () => void
}

function orientation(): Lockable | undefined {
  return typeof screen === 'undefined' ? undefined : (screen.orientation as unknown as Lockable | undefined)
}

function tryLock(value: 'portrait' | 'any'): void {
  try {
    orientation()
      ?.lock?.(value)
      .catch(() => {})
  } catch {
    // Not supported here.
  }
}

/** Portrait for the app in general (best effort). */
export function preferPortrait(): void {
  tryLock('portrait')
}

/** Allows any orientation; returns the function that goes back to portrait. */
export function allowAnyOrientation(): () => void {
  tryLock('any')
  return preferPortrait
}
