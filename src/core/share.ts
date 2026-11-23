/**
 * Shares the app link via the device's share sheet (Web Share API) or, where that is not
 * available, copies it to the clipboard.
 */
export type ShareOutcome = 'shared' | 'cancelled' | 'copied' | 'failed'

/** Public URL of the app (e.g. https://stefanniedermaier.github.io/riddles/). */
export function appUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href
}

export async function shareApp(title: string, text: string): Promise<ShareOutcome> {
  const url = appUrl()
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // fall back to copying
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
