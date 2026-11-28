#!/usr/bin/env node
// Checks the production build in dist/ before it is deployed:
//   - every HTML page carries the Content-Security-Policy and no inline event handlers
//   - search engine pages (plan 21): unique title and description, canonical URL = its own
//     address, noindex where intended, valid JSON-LD, preview images exist, sitemap lists
//     exactly the indexable pages
//   - no source maps, no eval / new Function in shipped JavaScript
//   - PWA files (service worker, manifest, icons) are present
//   - licenses.txt lists every third-party package shipped (incl. Workbox in the service worker)
//   - size budgets (gzip) for the initial load and for all JavaScript/CSS
//
//   node scripts/check-dist.mjs [dist]
//
// Budgets are deliberately ~25 % above the current size: raise them consciously when a
// feature needs it, and note the reason in the pull request.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = {
  /** JavaScript and CSS referenced by index.html (needed before the first paint). */
  initial: 100,
  /**
   * All JavaScript and CSS, including lazily loaded games (precached for offline use).
   * Raised from 280 to 360 kB for the four card games on a shared engine (plan 17), and to
   * 385 kB for Bubbles (plan 23, about 21 kB with its sci-fi scene).
   */
  total: 385,
}

const dist = process.argv[2] ?? 'dist'
const errors = []
const fail = (message) => errors.push(message)

const files = readdirSync(dist, { recursive: true })
  .map((file) => join(dist, String(file)))
  .filter((file) => statSync(file).isFile())
const gzipKb = (file) => gzipSync(readFileSync(file)).length / 1024
const text = (file) => readFileSync(file, 'utf8')

// --- HTML pages ---------------------------------------------------------------------------
const indexHtml = text(join(dist, 'index.html'))
const htmlFiles = files.filter((file) => extname(file) === '.html')
for (const file of htmlFiles) {
  const name = relative(dist, file)
  const html = text(file)
  const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1]
  if (!csp) fail(`${name}: Content-Security-Policy <meta> missing`)
  else {
    for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'"]) {
      if (!csp.includes(directive)) fail(`${name}: CSP lacks "${directive}"`)
    }
    if (/'unsafe-(inline|eval)'/.test(csp)) fail(`${name}: CSP allows 'unsafe-inline'/'unsafe-eval'`)
  }
  if (/\son[a-z]+\s*=/i.test(html)) fail(`${name}: inline event handler attribute found`)
  // Loaded resources only – canonical and language links point to the site's own address.
  const remoteScript = /<script\b[^>]*\bsrc="(https?:)?\/\//i.test(html)
  const remoteStyle = [...html.matchAll(/<link\b[^>]*>/gi)].some(
    ([tag]) => /\brel="(stylesheet|modulepreload|preload)"/i.test(tag) && /\bhref="(https?:)?\/\//i.test(tag),
  )
  if (remoteScript || remoteStyle) fail(`${name}: script or stylesheet loaded from another origin`)
}

// --- search engine pages (plan 21) ---------------------------------------------------------
const SITE = 'https://stefanniedermaier.github.io/riddles/'
const attr = (html, pattern) => pattern.exec(html)?.[1]
const titles = new Map()
const indexable = new Set()
for (const file of htmlFiles) {
  const name = relative(dist, file).split('\\').join('/')
  const html = text(file)
  const title = attr(html, /<title>([^<]+)<\/title>/)
  const noindex = /<meta name="robots" content="noindex"/.test(html)
  if (!title) fail(`${name}: <title> missing`)
  if (name === '404.html') {
    if (!noindex) fail('404.html: must be noindex')
    continue
  }
  if (!/<meta name="description" content="[^"]{50,}"/.test(html)) fail(`${name}: description missing or short`)
  if (!/<div class="prerender">[\s\S]*<h1>/.test(html)) fail(`${name}: static content with <h1> missing`)
  if (noindex) continue
  const expected = SITE + name.replace(/index\.html$/, '')
  if (attr(html, /<link rel="canonical" href="([^"]+)"/) !== expected) fail(`${name}: canonical is not ${expected}`)
  for (const language of ['en', 'de', 'x-default']) {
    if (!html.includes(`hreflang="${language}"`)) fail(`${name}: hreflang ${language} missing`)
  }
  const image = attr(html, /<meta property="og:image" content="([^"]+)"/)
  if (!image?.startsWith(SITE) || !files.includes(join(dist, image.slice(SITE.length)))) {
    fail(`${name}: og:image ${image ?? '(none)'} not in dist/`)
  }
  const jsonLd = attr(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  try {
    if (!jsonLd || !JSON.parse(jsonLd)['@type']) fail(`${name}: JSON-LD missing`)
  } catch {
    fail(`${name}: JSON-LD is not valid JSON`)
  }
  if (titles.has(title)) fail(`${name}: same title as ${titles.get(title)}`)
  titles.set(title, name)
  indexable.add(expected)
}
const sitemapFile = join(dist, 'sitemap.xml')
if (!files.includes(sitemapFile)) fail('sitemap.xml missing')
else {
  const listed = new Set([...text(sitemapFile).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]))
  for (const url of indexable) if (!listed.has(url)) fail(`sitemap.xml: ${url} missing`)
  for (const url of listed) if (!indexable.has(url)) fail(`sitemap.xml: ${url} is not an indexable page`)
}

// --- shipped code -----------------------------------------------------------------------
for (const file of files) {
  const name = relative(dist, file)
  if (file.endsWith('.map')) fail(`${name}: source map must not be deployed`)
  if (extname(file) === '.js') {
    const code = text(file)
    if (/\beval\s*\(|\bnew Function\s*\(/.test(code)) fail(`${name}: eval / new Function`)
    if (/sourceMappingURL=/.test(code)) fail(`${name}: sourceMappingURL comment`)
  }
}

// --- PWA --------------------------------------------------------------------------------
for (const required of ['sw.js', 'manifest.webmanifest', 'pwa-192x192.png', 'pwa-512x512.png']) {
  if (!files.includes(join(dist, required))) fail(`${required} missing`)
}

// --- third-party licences ----------------------------------------------------------------
const licensesFile = join(dist, 'licenses.txt')
if (!files.includes(licensesFile)) fail('licenses.txt missing (third-party licence notices)')
else {
  const licenses = text(licensesFile)
  const workboxModules = new Set(
    files
      .filter((file) => extname(file) === '.js')
      .flatMap((file) => [...text(file).matchAll(/workbox:([a-z-]+):\d/g)].map((match) => match[1])),
  )
  for (const module of workboxModules) {
    if (!licenses.includes(`workbox-${module}@`)) {
      fail(`licenses.txt: workbox-${module} is shipped but not listed (SERVICE_WORKER_PACKAGES in vite.config.ts)`)
    }
  }
  for (const name of ['@vue/runtime-core', 'vue-router']) {
    if (!licenses.includes(`${name}@`)) fail(`licenses.txt: ${name} missing`)
  }
}

// --- size budgets -----------------------------------------------------------------------
const assets = files.filter((file) => ['.js', '.css'].includes(extname(file)))
const initialAssets = [...indexHtml.matchAll(/(?:src|href)="\/riddles\/(assets\/[^"]+\.(?:js|css))"/g)]
  .map((match) => join(dist, match[1]))
const sizes = {
  initial: initialAssets.reduce((sum, file) => sum + gzipKb(file), 0),
  total: assets.reduce((sum, file) => sum + gzipKb(file), 0),
}
for (const [key, size] of Object.entries(sizes)) {
  const line = `${key.padEnd(8)} ${size.toFixed(1).padStart(6)} kB gzip (budget ${BUDGET_KB[key]} kB)`
  console.log(`${size > BUDGET_KB[key] ? '✖' : '✔'} ${line}`)
  if (size > BUDGET_KB[key]) fail(`size budget exceeded: ${line}`)
}
if (initialAssets.length === 0) fail('index.html: no assets found – base path changed?')

if (errors.length) {
  for (const error of errors) console.error(`::error::${error}`)
  process.exit(1)
}
console.log(`✔ dist/ ok: ${files.length} files, CSP present, no source maps, no eval, licences listed`)
