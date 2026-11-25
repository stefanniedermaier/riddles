/**
 * Sharing: the app link (home screen) and the result of a game as a challenge link.
 *
 * Shares via the device's share sheet (Web Share API) or, where that is not available,
 * copies the text and link to the clipboard.
 */
import { computed, getCurrentInstance } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

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

/** Shares a link with a title and text; falls back to copying "text link". */
export async function shareLink(url: string, title: string, text: string): Promise<ShareOutcome> {
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
    await navigator.clipboard.writeText(text ? `${text} ${url}` : url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export async function shareApp(title: string, text: string): Promise<ShareOutcome> {
  const url = appUrl()
  if (typeof navigator.share === 'function') return shareLink(url, title, text)
  // The plain app link is what people expect in the clipboard here.
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

// --- Challenges ------------------------------------------------------------------------

/** What a finished game shares: game, variant (difficulty/mode) and the result. */
export interface ResultShare {
  game: string
  /** Statistics variant, e.g. `easy`, `mini-hard`, `4x4`, `draw1`. */
  variant: string
  /** Formatted result (time like `3:09` or points like `12,340`), if any. */
  result?: string
  kind?: 'time' | 'score'
  /** A new personal best – the shared image shows a badge. */
  newBest?: boolean
}

export interface Challenge {
  variant: string
  result?: string
  kind?: 'time' | 'score'
}

/**
 * Link into the game's lobby with the challenge in the query. The lobby highlights the
 * variant – it never starts a game by itself, so a link cannot replace a running game.
 * Installed as an app (Android/Chrome), links inside the app's scope open in the app.
 */
export function challengeUrl(share: ResultShare): string {
  const query = new URLSearchParams({ challenge: share.variant })
  if (share.result) query.set('result', share.result)
  if (share.kind) query.set('kind', share.kind)
  return `${appUrl()}#/${share.game}?${query.toString()}`
}

/** A result from a link is shown in the lobby: only short times / numbers are accepted. */
const RESULT_PATTERN = /^[\d:.,'’ ]{1,14}$/

/** Reads and validates a challenge from the query of a lobby route. */
export function parseChallenge(
  query: Record<string, unknown>,
  variants: readonly string[],
): Challenge | null {
  const variant = query.challenge
  if (typeof variant !== 'string' || !variants.includes(variant)) return null
  const result = typeof query.result === 'string' && RESULT_PATTERN.test(query.result) ? query.result.trim() : undefined
  const kind = query.kind === 'time' || query.kind === 'score' ? query.kind : undefined
  return { variant, result, kind }
}

/** The current route, or undefined outside a router (component tests). */
export function useCurrentRoute() {
  const instance = getCurrentInstance()
  return computed(
    () => (instance?.proxy as { $route?: RouteLocationNormalizedLoaded } | null)?.$route,
  )
}
