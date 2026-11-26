/**
 * The public structure of the site: where it lives, the language prefix and the links of
 * older versions.
 *
 * - English pages live under the base path (`/riddles/sudoku/`), German pages under
 *   `/riddles/de/…`. Both run the same app; the page language decides the app language
 *   while the language setting is "system" (see `i18n.ts`), so search engines get German
 *   content on German pages.
 * - Before history routing the app used hash links (`#/sudoku?challenge=…`). Shared links,
 *   bookmarks and installed apps still use them: `rewriteLegacyHash` turns them into paths
 *   before the router starts.
 */
import type { Locale } from './i18n'

/** Public address of the site (canonical URLs, sitemap, link previews). */
const SITE_ORIGIN = 'https://stefanniedermaier.github.io'

/** Base path of the app (`/riddles/`). */
export const BASE = import.meta.env.BASE_URL

/** Path prefix of each language below the base path. */
export const LOCALE_PREFIX: Record<Locale, string> = { en: '', de: 'de/' }

/** Language of the page at `pathname`, or `null` for the default (English) pages. */
export function pageLocaleOf(pathname: string, base = BASE): Locale | null {
  const de = `${base}${LOCALE_PREFIX.de}`
  return pathname === de.slice(0, -1) || pathname.startsWith(de) ? 'de' : null
}

/** Router base for the page at `pathname`: `/riddles/` or `/riddles/de/`. */
export function routerBase(pathname: string, base = BASE): string {
  return `${base}${LOCALE_PREFIX[pageLocaleOf(pathname, base) ?? 'en']}`
}

/**
 * Path of an old hash link (`/riddles/#/sudoku?challenge=easy` → `/riddles/sudoku?challenge=easy`),
 * or `null` when the location has no hash route.
 */
export function legacyHashTarget(location: Pick<Location, 'pathname' | 'hash'>, base = BASE): string | null {
  if (!location.hash.startsWith('#/')) return null
  const route = location.hash.slice(2)
  return `${routerBase(location.pathname, base)}${route}`
}

/** Rewrites an old hash link in the address bar (no reload, no history entry). */
export function rewriteLegacyHash(): void {
  const target = legacyHashTarget(window.location)
  if (target !== null) window.history.replaceState(window.history.state, '', target)
}

/** Absolute URL of a path below the base path in a language (`sudoku/` → `https://…/riddles/de/sudoku/`). */
export function pageUrl(path: string, language: Locale = 'en'): string {
  return `${SITE_ORIGIN}${BASE}${LOCALE_PREFIX[language]}${path}`
}
