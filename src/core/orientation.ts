/**
 * The installed app is locked to portrait (web app manifest). Views that also work in
 * landscape (the card games) lift the lock while they are open. Browsers allow this only
 * for installed apps or in full screen; elsewhere the screen rotates freely anyway, so a
 * refused or missing API is ignored.
 */
interface Lockable {
  lock?: (orientation: string) => Promise<void>
  unlock?: () => void
}

function orientation(): Lockable | undefined {
  return typeof screen === 'undefined' ? undefined : (screen.orientation as unknown as Lockable | undefined)
}

/** Allows any orientation; returns the function that restores the default (portrait). */
export function allowAnyOrientation(): () => void {
  const target = orientation()
  if (!target?.lock) return () => {}
  target.lock('any').catch(() => {})
  return () => {
    try {
      target.unlock?.()
    } catch {
      // Not supported here – nothing to restore.
    }
  }
}
