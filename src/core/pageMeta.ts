/**
 * Keeps the head in step with the page while navigating inside the app – the same values
 * the build writes into every prerendered page (`scripts/seo.ts`), so a search engine that
 * renders JavaScript sees the same title, description and canonical URL as one that does not.
 *
 * Home and game pages are the indexable ones (canonical URL, language alternates); on all
 * other pages (settings, play views …) the canonical link and alternates are removed.
 */
import type { RouteLocationNormalized } from 'vue-router'

import { gameSlug } from '@/games/slugs'
import { locale, t, type Locale } from './i18n'
import { pageUrl } from './site'

export interface PageMeta {
  title: string
  description: string
  /** Path below the language prefix (`stars/`), or null when the page is not indexable. */
  path: string | null
}

/** Meta of the home page and of game lobbies; `null` for every other page. */
export function metaFor(route: Pick<RouteLocationNormalized, 'name'>, gameIds: readonly string[]): PageMeta | null {
  const name = typeof route.name === 'string' ? route.name : ''
  if (name === 'home') return { title: t('seo.title'), description: t('seo.description'), path: '' }
  if (gameIds.includes(name)) {
    return {
      title: t('seo.gameTitle', { game: t(`${name}.name` as Parameters<typeof t>[0]) }),
      description: t(`${name}.seo.about` as Parameters<typeof t>[0]),
      path: `${gameSlug(name)}/`,
    }
  }
  return null
}

function setMeta(selector: string, create: () => HTMLElement, attribute: string, value: string | null): void {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (value === null) {
    el?.remove()
    return
  }
  if (!el) {
    el = create()
    document.head.append(el)
  }
  el.setAttribute(attribute, value)
}

const metaTag = (attribute: 'name' | 'property', key: string) => () => {
  const el = document.createElement('meta')
  el.setAttribute(attribute, key)
  return el
}

const linkTag = (rel: string, hreflang?: string) => () => {
  const el = document.createElement('link')
  el.rel = rel
  if (hreflang) el.hreflang = hreflang
  return el
}

/** Applies `meta` to the document head (title is set by the caller). */
export function applyMeta(meta: PageMeta | null): void {
  const description = meta?.description ?? t('seo.description')
  setMeta('meta[name="description"]', metaTag('name', 'description'), 'content', description)
  const path = meta?.path ?? null
  const url = path === null ? null : pageUrl(path, locale.value)
  setMeta('link[rel="canonical"]', linkTag('canonical'), 'href', url)
  setMeta('meta[property="og:url"]', metaTag('property', 'og:url'), 'content', url)
  for (const language of ['en', 'de', 'x-default'] as const) {
    const target: Locale = language === 'x-default' ? 'en' : language
    setMeta(
      `link[rel="alternate"][hreflang="${language}"]`,
      linkTag('alternate', language),
      'href',
      path === null ? null : pageUrl(path, target),
    )
  }
}
