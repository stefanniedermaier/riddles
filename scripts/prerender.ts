#!/usr/bin/env node
// Writes the search engine pages after `vite build` (see scripts/seo.ts):
//   - one index.html per public page in English and German (the English home page is
//     dist/index.html itself, written by the Vite build as the app shell);
//   - 404.html – the app shell for any other path (GitHub Pages serves it with status 404);
//   - sitemap.xml.
//
//   node scripts/prerender.ts [dist]
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { fileOf, loadGames, pagesFor, renderNotFound, renderPage, sitemap } from './seo.ts'

const dist = process.argv[2] ?? 'dist'
const template = readFileSync(join(dist, 'index.html'), 'utf8')
const games = await loadGames()
const pages = pagesFor(games)

// The shell preloads the English texts (vite.config.ts, preloadTexts); German pages preload
// the German ones instead.
const textsChunk = (locale: string): string => {
  const found = readdirSync(join(dist, 'assets')).filter((file) => file.startsWith(`messages.${locale}-`) && file.endsWith('.js'))
  if (found.length !== 1) throw new Error(`prerender: expected one texts chunk for ${locale}, found ${found.length}`)
  return `assets/${found[0]}`
}
const englishTexts = textsChunk('en')
if (!template.includes(`href="/riddles/${englishTexts}"`)) throw new Error('prerender: index.html does not preload the English texts')
const templateFor = (locale: string) =>
  locale === 'en' ? template : template.replace(`href="/riddles/${englishTexts}"`, `href="/riddles/${textsChunk(locale)}"`)

let written = 0
for (const page of pages) {
  const file = join(dist, fileOf(page))
  if (file === join(dist, 'index.html')) continue // written by the build (app shell)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, renderPage(templateFor(page.locale), page, games))
  written++
}
writeFileSync(join(dist, '404.html'), renderNotFound(template, games))
writeFileSync(join(dist, 'sitemap.xml'), sitemap(pages, new Date().toISOString().slice(0, 10)))
console.log(`prerendered ${written} pages, 404.html and sitemap.xml`)
