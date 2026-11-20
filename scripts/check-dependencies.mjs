#!/usr/bin/env node
/**
 * Supply-chain checks for package.json / package-lock.json (no dependencies, runs before
 * `npm ci`):
 *
 * 1. Lockfile format v3 is present and matches the package name.
 * 2. Every locked package comes from the official npm registry over HTTPS and has a
 *    SHA-512 integrity hash (no git, tarball-URL, file or link dependencies).
 * 3. package.json only uses registry version ranges (no git/http/file specs).
 * 4. Packages that end up in the shipped app (everything reachable from `dependencies`)
 *    use a permissive license from ALLOWED_RUNTIME_LICENSES. Build tools (devDependencies)
 *    are not shipped and therefore not restricted here.
 *
 * Usage: node scripts/check-dependencies.mjs
 */
import { readFileSync } from 'node:fs'

const REGISTRY = 'https://registry.npmjs.org/'
const ALLOWED_RUNTIME_LICENSES = new Set([
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'Unlicense',
])
const NON_REGISTRY_SPEC = /^(git(\+\w+)?:|github:|gitlab:|bitbucket:|https?:|file:|link:|[\w.-]+\/[\w.-]+(#.*)?$)/

const errors = []
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))

// 1. Lockfile format
if (lock.lockfileVersion !== 3) errors.push(`lockfileVersion must be 3, got ${lock.lockfileVersion}`)
if (lock.name !== pkg.name) errors.push(`lockfile name "${lock.name}" != package name "${pkg.name}"`)

// 3. package.json specs
for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
  for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
    if (NON_REGISTRY_SPEC.test(spec)) errors.push(`${field}.${name}: non-registry spec "${spec}"`)
  }
}

/** SPDX expression → is it satisfiable with allowed licenses? (handles OR / AND / parens) */
function licenseAllowed(expression) {
  if (typeof expression !== 'string' || expression.length === 0) return false
  const clean = expression.replace(/[()]/g, ' ').trim()
  return clean
    .split(/\s+OR\s+/)
    .some((alternative) =>
      alternative.split(/\s+AND\s+/).every((id) => ALLOWED_RUNTIME_LICENSES.has(id.trim())),
    )
}

/** Resolves `name` as required from the package at `fromPath` (Node's lookup algorithm). */
function resolveLocked(fromPath, name) {
  let base = fromPath
  for (;;) {
    const candidate = `${base ? `${base}/` : ''}node_modules/${name}`
    if (lock.packages[candidate]) return candidate
    if (!base) return null
    const index = base.lastIndexOf('/node_modules/')
    base = index === -1 ? '' : base.slice(0, index)
  }
}

/** Lockfile paths of everything reachable from the production `dependencies`. */
function runtimeClosure() {
  const seen = new Set()
  const queue = Object.keys(pkg.dependencies ?? {}).map((name) => resolveLocked('', name))
  while (queue.length > 0) {
    const path = queue.pop()
    if (!path || seen.has(path)) continue
    seen.add(path)
    const entry = lock.packages[path]
    for (const name of Object.keys({ ...entry.dependencies, ...entry.optionalDependencies })) {
      queue.push(resolveLocked(path, name))
    }
  }
  return seen
}

const runtimePaths = runtimeClosure()

// 2. + 4. every locked package
let checked = 0
let runtime = 0
for (const [path, entry] of Object.entries(lock.packages ?? {})) {
  if (path === '') continue // the project itself
  checked++
  const name = path.split('node_modules/').pop()

  if (entry.link) {
    errors.push(`${name}: linked package (${entry.resolved}) is not allowed`)
    continue
  }
  if (typeof entry.resolved !== 'string' || !entry.resolved.startsWith(REGISTRY)) {
    errors.push(`${name}: resolved from "${entry.resolved}" instead of ${REGISTRY}`)
  }
  if (typeof entry.integrity !== 'string' || !entry.integrity.startsWith('sha512-')) {
    errors.push(`${name}: missing or weak integrity hash (${entry.integrity})`)
  }
  if (runtimePaths.has(path)) {
    runtime++
    if (!licenseAllowed(entry.license)) {
      errors.push(`${name}: runtime dependency with non-allowed license "${entry.license}"`)
    }
  }
}

if (errors.length > 0) {
  console.error(`✖ Dependency check failed (${errors.length} problem(s)):`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}
console.log(
  `✔ ${checked} locked packages from ${REGISTRY} with sha512 integrity; ` +
    `${runtime} runtime packages with allowed licenses.`,
)
