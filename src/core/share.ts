/**
 * Shares the app link via the device's share sheet (Web Share API) or, where that is not
 * available, copies it to the clipboard.
 */
export type ShareOutcome = 'shared' | 'cancelled' | 'copied' | 'failed'

/** Public URL of the app (e.g. https://stefanniedermaier.github.io/riddles/). */
export function appUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href
}

/**
 * Whether the device is an Apple one (iPhone, iPad, Mac). iPadOS reports itself as a Mac,
 * so the platform string is enough. Used to pick the share icon users know from their OS:
 * a box with an upward arrow on Apple devices, three connected nodes elsewhere.
 */
export function isApplePlatform(nav: Pick<Navigator, 'userAgent' | 'platform'> = navigator): boolean {
  const data = (nav as { userAgentData?: { platform?: string } }).userAgentData
  const platform = data?.platform || nav.platform || ''
  return /mac|iphone|ipad|ipod/i.test(platform) || /iphone|ipad|ipod|macintosh/i.test(nav.userAgent)
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
