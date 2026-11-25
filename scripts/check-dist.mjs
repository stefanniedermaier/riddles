#!/usr/bin/env node
// Checks the production build in dist/ before it is deployed:
//   - index.html carries the Content-Security-Policy and no inline event handlers
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
   * Raised from 280 to 360 kB for the four card games on a shared engine (plan 17).
   */
  total: 360,
}

const dist = process.argv[2] ?? 'dist'
const errors = []
const fail = (message) => errors.push(message)

const files = readdirSync(dist, { recursive: true })
  .map((file) => join(dist, String(file)))
  .filter((file) => statSync(file).isFile())
const gzipKb = (file) => gzipSync(readFileSync(file)).length / 1024
const text = (file) => readFileSync(file, 'utf8')

// --- index.html -------------------------------------------------------------------------
const indexHtml = text(join(dist, 'index.html'))
const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(indexHtml)?.[1]
if (!csp) fail('index.html: Content-Security-Policy <meta> missing')
else {
  for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'"]) {
    if (!csp.includes(directive)) fail(`index.html: CSP lacks "${directive}"`)
  }
  if (/'unsafe-(inline|eval)'/.test(csp)) fail("index.html: CSP allows 'unsafe-inline'/'unsafe-eval'")
}
if (/\son[a-z]+\s*=/i.test(indexHtml)) fail('index.html: inline event handler attribute found')
if (/<(script|link)\b[^>]*\b(src|href)="(https?:)?\/\//i.test(indexHtml)) {
  fail('index.html: script or stylesheet loaded from another origin')
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
