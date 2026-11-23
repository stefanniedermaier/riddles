#!/usr/bin/env node
// Checks the production build in dist/ before it is deployed:
//   - performance budgets (gzip sizes) so the offline bundle does not grow unnoticed,
//   - no source maps, no references to third-party origins in code or markup,
//   - the Content-Security-Policy meta tag, the web app manifest and the service worker exist.
// Usage: node scripts/check-dist.mjs [dist-dir]
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const DIST = process.argv[2] ?? 'dist'

/** Budgets in KiB (gzip). Raise deliberately, with a note in the changelog. */
const BUDGET = {
  totalJs: 260,
  totalCss: 40,
  largestJsChunk: 60,
  entryJs: 30,
}

/**
 * Origins the shipped files may mention: links shown to the user, error-message links in
 * Vue/Workbox, XML namespaces. Anything new needs a deliberate decision. (Requests to other
 * origins are blocked by the CSP anyway; this catches new third-party code and links early.)
 */
const ALLOWED_ORIGINS = [
  'https://stefanniedermaier.github.io',
  'https://github.com',
  'https://docs.github.com',
  'https://vuejs.org',
  'https://bit.ly', // Workbox error-message documentation links
  'http://www.w3.org', // SVG namespace
]

const errors = []
const fail = (message) => errors.push(message)
const kib = (bytes) => bytes / 1024

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const files = walk(DIST).map((path) => ({ path, rel: relative(DIST, path) }))
const gz = (path) => gzipSync(readFileSync(path), { level: 9 }).length

// --- Source maps -------------------------------------------------------------------------
for (const { rel, path } of files) {
  if (rel.endsWith('.map')) fail(`source map shipped: ${rel}`)
  if (/\.(js|css)$/.test(rel) && /sourceMappingURL=/.test(readFileSync(path, 'utf8'))) {
    fail(`sourceMappingURL comment in ${rel}`)
  }
}

// --- Third-party origins -----------------------------------------------------------------
for (const { rel, path } of files) {
  if (!/\.(js|css|html|webmanifest)$/.test(rel)) continue
  const text = readFileSync(path, 'utf8')
  for (const [url] of text.matchAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)) {
    if (!ALLOWED_ORIGINS.some((origin) => url.toLowerCase().startsWith(origin))) {
      fail(`unexpected external origin ${url} in ${rel}`)
    }
  }
}

// --- Required files and CSP --------------------------------------------------------------
const html = readFileSync(join(DIST, 'index.html'), 'utf8')
const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1]
if (!csp) fail('index.html has no Content-Security-Policy meta tag')
else {
  for (const directive of ["default-src 'self'", "object-src 'none'", "base-uri 'self'"]) {
    if (!csp.includes(directive)) fail(`CSP lacks "${directive}"`)
  }
  if (/unsafe-(inline|eval)/.test(csp)) fail('CSP allows unsafe-inline / unsafe-eval')
}
for (const required of ['manifest.webmanifest', 'sw.js']) {
  if (!files.some((file) => file.rel === required)) fail(`${required} is missing`)
}

// --- Budgets ------------------------------------------------------------------------------
const js = files.filter((file) => file.rel.startsWith('assets/') && file.rel.endsWith('.js'))
const css = files.filter((file) => file.rel.startsWith('assets/') && file.rel.endsWith('.css'))
const sizes = js.map((file) => ({ ...file, gz: gz(file.path) })).sort((a, b) => b.gz - a.gz)
const totalJs = sizes.reduce((sum, file) => sum + file.gz, 0)
const totalCss = css.reduce((sum, file) => sum + gz(file.path), 0)
const entryName = /<script type="module" crossorigin src="\/riddles\/(assets\/[^"]+\.js)"/.exec(html)?.[1]
const entry = sizes.find((file) => file.rel === entryName)
if (!entry) fail('entry script not found in index.html')

const rows = [
  ['total JS', totalJs, BUDGET.totalJs],
  ['total CSS', totalCss, BUDGET.totalCss],
  [`largest JS chunk (${sizes[0]?.rel})`, sizes[0]?.gz ?? 0, BUDGET.largestJsChunk],
  [`entry JS (${entry?.rel})`, entry?.gz ?? 0, BUDGET.entryJs],
]
for (const [label, bytes, budget] of rows) {
  const status = kib(bytes) <= budget ? '✔' : '✘'
  console.log(`${status} ${label}: ${kib(bytes).toFixed(1)} KiB gzip (budget ${budget} KiB)`)
  if (kib(bytes) > budget) fail(`${label} exceeds its budget of ${budget} KiB`)
}

if (errors.length) {
  for (const error of errors) console.error(`✘ ${error}`)
  process.exit(1)
}
console.log(`✔ ${files.length} files in ${DIST}/: no source maps, no third-party origins, CSP, manifest and service worker present`)
