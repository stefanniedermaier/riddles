#!/usr/bin/env node
/**
 * Release consistency check (used by CI for tag builds, and locally before tagging):
 *
 * 1. The tag has the form vMAJOR.MINOR.PATCH (optionally -prerelease).
 * 2. It matches the version in package.json and package-lock.json.
 * 3. CHANGELOG.md has a section "## [MAJOR.MINOR.PATCH]" with content.
 *
 * Usage:
 *   node scripts/check-release.mjs v1.2.3            # check a tag name
 *   node scripts/check-release.mjs                   # check "v" + package.json version
 *   node scripts/check-release.mjs v1.2.3 --notes    # additionally print the changelog section
 */
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const printNotes = args.includes('--notes')
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

const pkg = JSON.parse(read('package.json'))
const lock = JSON.parse(read('package-lock.json'))
const tag = args.find((arg) => !arg.startsWith('--')) ?? `v${pkg.version}`

const errors = []
const match = /^v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(tag)
if (!match) errors.push(`tag "${tag}" is not of the form vMAJOR.MINOR.PATCH`)
const version = match?.[1] ?? ''

if (match && pkg.version !== version) {
  errors.push(`tag ${tag} does not match package.json version ${pkg.version}`)
}
if (lock.version !== pkg.version || lock.packages?.['']?.version !== pkg.version) {
  errors.push('package-lock.json version differs from package.json (run `npm install`)')
}

/** Text of the changelog section for `version` (without its heading). */
function changelogSection(changelog, wanted) {
  const lines = changelog.split('\n')
  const start = lines.findIndex((line) => line.startsWith(`## [${wanted}]`))
  if (start === -1) return null
  const end = lines.findIndex((line, i) => i > start && line.startsWith('## '))
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join('\n')
    .trim()
}

const notes = match ? changelogSection(read('CHANGELOG.md'), version) : null
if (match && !notes) errors.push(`CHANGELOG.md has no (non-empty) section "## [${version}]"`)

if (errors.length > 0) {
  console.error(`✖ Release check failed for ${tag}:`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

if (printNotes) console.log(notes)
else console.log(`✔ ${tag} matches package.json, package-lock.json and CHANGELOG.md`)
