#!/usr/bin/env node
// Renders the link preview images (1200 × 630 JPEG) to public/og/<lang>/: app.jpg and one per
// game, in English and German.
// Run after changing a game logo or adding a game, and commit the result:
//
//   npm run og-images
//
// Uses the Vite dev server and Playwright's Chromium (both already dev dependencies); set
// CHROMIUM_PATH to use another Chromium binary.
import { mkdirSync, statSync } from 'node:fs'

import { chromium } from '@playwright/test'
import { createServer } from 'vite'

import { gameOrder } from './seo.ts'

const MAX_KB = 120
const server = await createServer({ server: { port: 5188, strictPort: true }, logLevel: 'error' })
await server.listen()
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
try {
  for (const [lang, game] of ['en', 'de'].flatMap((l) => ['app', ...gameOrder()].map((g) => [l, g]))) {
    mkdirSync(`public/og/${lang}`, { recursive: true })
    await page.goto(`http://localhost:5188/riddles/scripts/og-images/index.html?game=${game}&lang=${lang}`)
    await page.locator('.card').waitFor()
    await page.evaluate(() => document.fonts.ready)
    const file = `public/og/${lang}/${game}.jpg`
    await page.locator('.card').screenshot({ path: file, type: 'jpeg', quality: 86 })
    const kb = statSync(file).size / 1024
    console.log(`${file}  ${kb.toFixed(0)} kB`)
    if (kb > MAX_KB) throw new Error(`${file} is larger than ${MAX_KB} kB`)
  }
} finally {
  await browser.close()
  await server.close()
}
