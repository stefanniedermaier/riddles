#!/usr/bin/env node
// Writes the search engine pages after `vite build` (see scripts/seo.ts):
//   - one index.html per public page in English and German (the English home page is
//     dist/index.html itself, written by the Vite build as the app shell);
//   - 404.html – the app shell for any other path (GitHub Pages serves it with status 404);
//   - sitemap.xml.
//
//   node scripts/prerender.ts [dist]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { fileOf, loadGames, pagesFor, renderNotFound, renderPage, sitemap } from './seo.ts'

const dist = process.argv[2] ?? 'dist'
const template = readFileSync(join(dist, 'index.html'), 'utf8')
const games = await loadGames()
const pages = pagesFor(games)

let written = 0
for (const page of pages) {
  const file = join(dist, fileOf(page))
  if (file === join(dist, 'index.html')) continue // written by the build (app shell)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, renderPage(template, page, games))
  written++
}
writeFileSync(join(dist, '404.html'), renderNotFound(template, games))
writeFileSync(join(dist, 'sitemap.xml'), sitemap(pages, new Date().toISOString().slice(0, 10)))
console.log(`prerendered ${written} pages, 404.html and sitemap.xml`)
