/**
 * Search engine pages: head (title, description, canonical, hreflang, link previews,
 * structured data) and a static body for every public page of the app, in English and
 * German – built from the same catalogues the app shows (`src/i18n`, `src/games/<id>/i18n.ts`).
 *
 * Used twice:
 * - by the Vite build (`vite.config.ts`) for the English home page, which is also the app
 *   shell the service worker precaches;
 * - by `scripts/prerender.ts` after the build for all other pages, `404.html` and the sitemap.
 *
 * The static body is replaced as soon as the app mounts (and hidden before that when
 * JavaScript runs, see `.prerender` in base.css): it serves crawlers without JavaScript and
 * link previews. It shows the same texts as the app – no hidden extra content.
 *
 * Runs in Node without a build step (type stripping): only type imports from `src`, and
 * relative imports with their `.ts` extension.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import appDe from '../src/i18n/de.ts'
import appEn from '../src/i18n/en.ts'
import { gameSlug } from '../src/games/slugs.ts'

type Locale = 'en' | 'de'
const LOCALES: readonly Locale[] = ['en', 'de']

const SITE_ORIGIN = 'https://stefanniedermaier.github.io'
const BASE = '/riddles/'
const PREFIX: Record<Locale, string> = { en: '', de: 'de/' }
const OG_LOCALE: Record<Locale, string> = { en: 'en_US', de: 'de_DE' }

/**
 * Project root. Not derived from `import.meta.url`: the Vite build bundles this file into a
 * temporary config module elsewhere. Build and scripts run from the project root.
 */
const ROOT = process.cwd()

interface GameTexts {
  name: string
  tagline: string
  about: string
  rules: string[]
}

export interface Game {
  id: string
  slug: string
  texts: Record<Locale, GameTexts>
}

type AppSeo = typeof appEn.seo
const APP: Record<Locale, { name: string; seo: AppSeo; notFound: string }> = {
  en: { name: appEn.app.name, seo: appEn.seo, notFound: appEn.notFound.title },
  de: { name: appDe.app.name, seo: appDe.seo, notFound: appDe.notFound.title },
}

/** Game ids in the app's default order, read from `src/games/modules.ts` (the only list). */
export function gameOrder(source = readFileSync(join(ROOT, 'src/games/modules.ts'), 'utf8')): string[] {
  const list = /export const gameModules = \[([^\]]+)\]/.exec(source)?.[1]
  if (!list) throw new Error('gameModules not found in src/games/modules.ts')
  return list.split(',').map((id) => id.trim()).filter(Boolean)
}

/** Rule texts of a game: every plain sentence below `rules` (no titles, no placeholders). */
function ruleTexts(rules: unknown): string[] {
  if (typeof rules !== 'object' || rules === null) return []
  return Object.entries(rules)
    .filter(([key, value]) => typeof value === 'string' && !/title$/i.test(key) && !value.includes('{'))
    .map(([, value]) => value as string)
}

/** All games with their texts in both languages. */
export async function loadGames(): Promise<Game[]> {
  const ids = gameOrder()
  const known = new Set(
    readdirSync(join(ROOT, 'src/games'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name),
  )
  return Promise.all(
    ids.map(async (id) => {
      if (!known.has(id)) throw new Error(`unknown game ${id}`)
      const url = pathToFileURL(join(ROOT, 'src/games', id, 'i18n.ts')).href
      const catalogue = (await import(url)) as Record<Locale, Record<string, unknown>>
      const textsOf = (locale: Locale): GameTexts => {
        const c = catalogue[locale] as { name: string; tagline: string; seo: { about: string }; rules?: unknown }
        return { name: c.name, tagline: c.tagline, about: c.seo.about, rules: ruleTexts(c.rules) }
      }
      return { id, slug: gameSlug(id), texts: { en: textsOf('en'), de: textsOf('de') } }
    }),
  )
}

// --- Pages -------------------------------------------------------------------------------

export interface Page {
  /** Path below the language prefix, '' for the home page, otherwise ending with '/'. */
  path: string
  locale: Locale
  kind: 'home' | 'game' | 'app'
  game?: Game
  /** Title for app pages (settings …). */
  title?: string
  /** Listed in the sitemap and open to search engines. */
  indexable: boolean
}

const APP_PAGES = ['stats', 'settings', 'privacy', 'imprint'] as const

/** Every page that gets a file, in both languages. */
export function pagesFor(games: Game[]): Page[] {
  return LOCALES.flatMap((locale) => [
    { path: '', locale, kind: 'home' as const, indexable: true },
    ...games.map((game) => ({ path: `${game.slug}/`, locale, kind: 'game' as const, game, indexable: true })),
    // App pages exist so that a reload works (HTTP 200); they hold nothing to search for.
    ...APP_PAGES.map((name) => ({
      path: `${name}/`,
      locale,
      kind: 'app' as const,
      title: appTitle(name, locale),
      indexable: false,
    })),
  ])
}

function appTitle(name: (typeof APP_PAGES)[number], locale: Locale): string {
  const app = locale === 'en' ? appEn : appDe
  const titles = { stats: app.stats.title, settings: app.settings.title, privacy: app.privacy.title, imprint: app.imprint.title }
  return titles[name]
}

/** Absolute URL of a page path in a language. */
export function urlOf(path: string, locale: Locale): string {
  return `${SITE_ORIGIN}${BASE}${PREFIX[locale]}${path}`
}

/** Site-relative href (`/riddles/de/stars/`). */
function hrefOf(path: string, locale: Locale): string {
  return `${BASE}${PREFIX[locale]}${path}`
}

/** File of a page in dist/ (`de/stars/index.html`). */
export function fileOf(page: Pick<Page, 'path' | 'locale'>): string {
  return `${PREFIX[page.locale]}${page.path}index.html`
}

// --- HTML --------------------------------------------------------------------------------

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** JSON for a <script type="application/ld+json"> block (no `</script>` break-out). */
const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')

function titleOf(page: Page): string {
  const app = APP[page.locale]
  if (page.kind === 'home') return app.seo.title
  if (page.kind === 'game') return app.seo.gameTitle.replace('{game}', page.game!.texts[page.locale].name)
  return `${page.title} – ${app.name}`
}

function descriptionOf(page: Page): string {
  return page.kind === 'game' ? page.game!.texts[page.locale].about : APP[page.locale].seo.description
}

function imageOf(page: Page): string {
  return `${SITE_ORIGIN}${BASE}og/${page.locale}/${page.kind === 'game' ? page.game!.id : 'app'}.jpg`
}

function structuredData(page: Page): unknown {
  const app = APP[page.locale]
  const site = {
    '@type': 'WebApplication',
    name: app.name,
    url: urlOf('', page.locale),
    description: app.seo.description,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (web browser, Android, iOS)',
    inLanguage: page.locale,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    image: `${SITE_ORIGIN}${BASE}og/${page.locale}/app.jpg`,
  }
  if (page.kind !== 'game') return { '@context': 'https://schema.org', ...site }
  const texts = page.game!.texts[page.locale]
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: texts.name,
    description: texts.about,
    url: urlOf(page.path, page.locale),
    genre: 'Puzzle',
    gamePlatform: ['Web browser', 'Android', 'iOS'],
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (web browser, Android, iOS)',
    inLanguage: page.locale,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    image: imageOf(page),
    isPartOf: site,
  }
}

/** The <head> block of a page (between the `seo:start` / `seo:end` markers). */
export function headOf(page: Page): string {
  const title = escape(titleOf(page))
  const description = escape(descriptionOf(page))
  const lines = [`<title>${title}</title>`, `<meta name="description" content="${description}" />`]
  if (!page.indexable) {
    lines.push('<meta name="robots" content="noindex" />')
    return lines.join('\n    ')
  }
  const url = urlOf(page.path, page.locale)
  const other = page.locale === 'en' ? 'de' : 'en'
  lines.push(
    `<link rel="canonical" href="${url}" />`,
    ...LOCALES.map((locale) => `<link rel="alternate" hreflang="${locale}" href="${urlOf(page.path, locale)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${urlOf(page.path, 'en')}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escape(APP[page.locale].name)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${imageOf(page)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${title}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[page.locale]}" />`,
    `<meta property="og:locale:alternate" content="${OG_LOCALE[other]}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${jsonLd(structuredData(page))}</script>`,
  )
  return lines.join('\n    ')
}

/** Links to every game (internal linking for crawlers). */
function gameList(games: Game[], locale: Locale, except?: string): string {
  const items = games
    .filter((game) => game.id !== except)
    .map((game) => {
      const t = game.texts[locale]
      return `<li><a href="${hrefOf(`${game.slug}/`, locale)}">${escape(t.name)}</a> – ${escape(t.tagline)}</li>`
    })
  return `<ul>${items.join('')}</ul>`
}

/** The static body (inside #app, between the `content:start` / `content:end` markers). */
export function bodyOf(page: Page, games: Game[]): string {
  const app = APP[page.locale]
  const other = page.locale === 'en' ? 'de' : 'en'
  const nav =
    `<p class="prerender__nav"><a href="${hrefOf('', page.locale)}">${escape(app.name)}</a>` +
    (page.indexable
      ? ` · <a href="${hrefOf(page.path, other)}" hreflang="${other}" lang="${other}">${escape(app.seo.otherLanguage)}</a>`
      : '') +
    '</p>'
  let main: string
  if (page.kind === 'home') {
    main =
      `<h1>${escape(app.name)}</h1><p>${escape(app.seo.intro)}</p>` +
      `<h2>${escape(app.seo.games)}</h2>${gameList(games, page.locale)}`
  } else if (page.kind === 'game') {
    const t = page.game!.texts[page.locale]
    const rules = t.rules.length
      ? `<h2>${escape(app.seo.howTo)}</h2><ul>${t.rules.map((rule) => `<li>${escape(rule)}</li>`).join('')}</ul>`
      : ''
    main =
      `<h1>${escape(t.name)}</h1><p>${escape(t.tagline)}</p><p>${escape(t.about)}</p>${rules}` +
      `<h2>${escape(app.seo.moreGames)}</h2>${gameList(games, page.locale, page.game!.id)}`
  } else {
    main = `<h1>${escape(page.title ?? app.name)}</h1>`
  }
  return `<div class="prerender">${nav}<main>${main}</main></div>`
}

/** Replaces the head and body markers and the language of a built index.html. */
function render(template: string, head: string, body: string, locale: Locale): string {
  const replaced = template
    .replace(/<html lang="[a-z]+"/, `<html lang="${locale}"`)
    .replace(/<!-- seo:start -->[\s\S]*?<!-- seo:end -->/, `<!-- seo:start -->\n    ${head}\n    <!-- seo:end -->`)
    .replace(/<!-- content:start -->[\s\S]*?<!-- content:end -->/, `<!-- content:start -->${body}<!-- content:end -->`)
  if (!replaced.includes('<!-- seo:start -->') || !replaced.includes('<!-- content:start -->')) {
    throw new Error('index.html lacks the seo/content markers')
  }
  return replaced
}

/** A page as a whole (template = built index.html). */
export function renderPage(template: string, page: Page, games: Game[]): string {
  return render(template, headOf(page), bodyOf(page, games), page.locale)
}

/** 404.html: the app shell for unknown paths (the SPA shows its not-found page). */
export function renderNotFound(template: string, games: Game[]): string {
  const head = [`<title>${escape(APP.en.notFound)} – ${escape(APP.en.name)}</title>`, '<meta name="robots" content="noindex" />'].join(
    '\n    ',
  )
  const body = `<div class="prerender"><main><h1>${escape(APP.en.notFound)}</h1>${gameList(games, 'en')}</main></div>`
  return render(template, head, body, 'en')
}

/** sitemap.xml with both languages as alternates of each page. */
export function sitemap(pages: Page[], lastmod: string): string {
  const urls = pages
    .filter((page) => page.indexable)
    .map((page) => {
      const alternates = LOCALES.map(
        (locale) => `<xhtml:link rel="alternate" hreflang="${locale}" href="${urlOf(page.path, locale)}"/>`,
      ).join('')
      return `<url><loc>${urlOf(page.path, page.locale)}</loc><lastmod>${lastmod}</lastmod>${alternates}</url>`
    })
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    urls.join('\n') +
    '\n</urlset>\n'
  )
}
