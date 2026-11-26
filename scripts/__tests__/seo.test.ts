import { readdirSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { bodyOf, gameOrder, headOf, loadGames, pagesFor, renderNotFound, renderPage, sitemap, urlOf } from '../seo.ts'

const TEMPLATE = `<!doctype html><html lang="en"><head><!-- seo:start --><title>x</title><!-- seo:end --></head>
<body><div id="app"><!-- content:start --><!-- content:end --></div></body></html>`

describe('search engine pages', async () => {
  const games = await loadGames()
  const pages = pagesFor(games)

  it('reads every game from src/games/modules.ts in the app order', () => {
    const dirs = readdirSync('src/games', { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== '__tests__')
      .map((d) => d.name)
    expect([...gameOrder()].sort()).toEqual(dirs.sort())
    expect(gameOrder()[0]).toBe('sudoku')
  })

  it('has one page per game and app page in both languages, under the game slug', () => {
    expect(pages).toHaveLength(2 * (1 + games.length + 4))
    expect(new Set(pages.map((p) => `${p.locale}:${p.path}`)).size).toBe(pages.length)
    expect(pages.some((p) => p.path === 'stars/' && p.game?.id === 'crowns')).toBe(true)
    expect(pages.some((p) => p.path === 'crowns/')).toBe(false)
    for (const game of games) {
      for (const locale of ['en', 'de'] as const) {
        expect(game.texts[locale].about.length).toBeGreaterThan(50)
        expect(game.texts[locale].about.length).toBeLessThanOrEqual(160)
      }
    }
  })

  it('gives indexable pages canonical, hreflang, previews and valid structured data', () => {
    const page = pages.find((p) => p.locale === 'de' && p.path === 'stars/')!
    const head = headOf(page)
    expect(head).toContain(`<link rel="canonical" href="${urlOf('stars/', 'de')}" />`)
    expect(head).toContain(`hreflang="en" href="${urlOf('stars/', 'en')}"`)
    expect(head).toContain('hreflang="x-default"')
    expect(head).toContain('og/de/crowns.jpg')
    const json = /<script type="application\/ld\+json">(.*)<\/script>/.exec(head)![1]
    expect(json).not.toContain('</')
    expect(JSON.parse(json)).toMatchObject({ '@type': 'VideoGame', name: 'Stars', inLanguage: 'de' })
  })

  it('keeps app pages out of the index', () => {
    const settings = pages.find((p) => p.path === 'settings/' && p.locale === 'en')!
    expect(headOf(settings)).toContain('noindex')
    expect(headOf(settings)).not.toContain('canonical')
  })

  it('renders the same texts as the app, escaped, with links to the other games', () => {
    const page = pages.find((p) => p.locale === 'en' && p.path === 'mines/')!
    const body = bodyOf(page, games)
    expect(body).toContain('<h1>Mines</h1>')
    expect(body).toContain('href="/riddles/stars/"')
    expect(body).not.toContain('href="/riddles/mines/"')
    expect(body).toContain('hreflang="de"')
    const html = renderPage(TEMPLATE, page, games)
    expect(html).toContain('<html lang="en"')
    expect(renderPage(TEMPLATE, { ...page, locale: 'de' }, games)).toContain('<html lang="de"')
    expect(html).not.toMatch(/<title>x<\/title>/)
    expect(() => renderPage('<html lang="en">', page, games)).toThrow(/markers/)
    expect(renderNotFound(TEMPLATE, games)).toContain('noindex')
  })

  it('lists exactly the indexable pages in the sitemap', () => {
    const xml = sitemap(pages, '2026-11-26')
    expect(xml.match(/<url>/g)).toHaveLength(pages.filter((p) => p.indexable).length)
    expect(xml).toContain(`<loc>${urlOf('', 'de')}</loc>`)
    expect(xml).not.toContain('settings/')
  })
})
