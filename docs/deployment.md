# Deployment

The app is deployed to **GitHub Pages** by the workflow
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

URL: <https://stefanniedermaier.github.io/riddles/>

## One-time setup

1. Push the initial history to `main`.
2. Apply the repository configuration (Pages via Actions, environment restricted to release tags,
   security features, Actions policy, rulesets – see [security §4](security.md#4-repository-configuration)):

   ```bash
   scripts/github/configure-repo.sh
   ```

   The script is idempotent; rerun it after changing `.github/rulesets/*.json`.
3. From now on every change goes through a pull request with signed commits.

## Workflow

Deployments are driven by the **version number**: only a signed tag `vX.Y.Z` deploys.

```
pull request:  dependency-review + all checks below                 (no deploy)
push to main:  repo-lint, secret-scan, supply-chain, codeql,       (no deploy)
               verify, e2e
weekly (Mon):  same as push to main – catches new advisories       (no deploy)

tag vX.Y.Z:    release-check ──┐
               repo-lint ──────┤
               secret-scan ────┤
               supply-chain ───┼──▶ deploy (GitHub Pages) ──▶ release (GitHub Release + SBOM)
               codeql ─────────┤    only if all seven succeed
               verify ─────────┤
               e2e ────────────┘
```

| Job                 | When        | Checks                                                                                       |
| ------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `dependency-review` | PRs         | New/updated packages (npm and the Go modules of the CI tools): no known vulnerability ≥ moderate, license on the allow list (a few CI-only Go packages exempted by name, see `deploy.yml`), OpenSSF Scorecard warning |
| `repo-lint`         | always      | [actionlint](https://github.com/rhysd/actionlint) (workflow syntax, expressions, embedded shell scripts via shellcheck), [zizmor](https://docs.zizmor.sh) (workflow security: injection, permissions, cache poisoning, impostor commits, vulnerable actions), [editorconfig-checker](https://editorconfig-checker.github.io) |
| `secret-scan`       | always      | [gitleaks](https://github.com/gitleaks/gitleaks) over the full git history (complements GitHub secret scanning, also for fork PRs) |
| `supply-chain`      | always      | `scripts/check-dependencies.mjs` (see below), `npm ci --ignore-scripts`, `npm audit signatures`, `npm audit` (runtime: no vulnerability ≥ moderate; all: none ≥ high), [OSV-Scanner](https://google.github.io/osv-scanner/) on the lockfile (osv.dev incl. malicious-package advisories) |
| `codeql`            | always      | CodeQL `security-extended` analysis of the TypeScript/Vue code and the workflow files        |
| `release-check`     | tags        | tag = `package.json`/lockfile version, `CHANGELOG.md` section exists, tagged commit is on `main`, tag is annotated and its signature verified |
| `verify`            | always      | lint, type-check, unit tests, [knip](https://knip.dev) (unused files/dependencies), production build, `scripts/check-dist.mjs` (CSP, no source maps/`eval`, PWA files, gzip size budgets), clean working tree, SBOM; on tags also attestations and upload of `dist/` |
| `e2e`               | always      | Playwright against the production build (Chromium desktop + mobile, light + dark): every page renders without console errors, CSP violations or third-party requests, no WCAG 2.2 A/AA violations (axe), navigation, offline start via service worker; report uploaded on failure |
| `deploy`            | tags only   | publishes the uploaded artifact – needs all jobs above except `dependency-review` |
| `release`           | tags only   | creates the GitHub Release with the changelog section as notes and the SBOM attached      |

## Releasing a new version

1. In a pull request: bump the version and move the changelog entries from *Unreleased* to a
   new section `## [X.Y.Z] – YYYY-MM-DD`:

   ```bash
   npm version X.Y.Z --no-git-tag-version   # updates package.json + package-lock.json
   # edit CHANGELOG.md, then
   npm run release:check                    # tag/version/changelog consistency
   ```

2. Merge the PR (all checks green).
3. Tag the merged commit on `main` with a **signed, annotated** tag and push it:

   ```bash
   git switch main && git pull --ff-only
   git tag -s vX.Y.Z -m "Riddles vX.Y.Z"
   git push origin vX.Y.Z
   ```

4. The workflow deploys and publishes the release. Installed apps show the update banner.

Tags are protected by the `release-tags` ruleset (signed, cannot be moved or deleted). A
failed release is fixed with a new patch version, never by moving a tag.

### Supply-chain safeguards

| Safeguard                         | Where                               | Protects against                                                  |
| --------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| Lockfile check                    | `npm run check:deps`                | packages from other registries, git/URL/file dependencies, missing sha512 integrity, non-permissive licenses in shipped code |
| `npm ci --ignore-scripts`         | CI                                  | exact lockfile versions only; no install scripts executed         |
| `npm audit signatures`            | CI, `npm run audit:ci`              | tampered packages (registry signatures, Sigstore provenance)      |
| `npm audit`                       | CI, `npm run audit:ci`              | known vulnerabilities                                             |
| Dependency review                 | PRs                                 | vulnerable or unexpectedly licensed new dependencies              |
| CodeQL                            | CI                                  | security bugs in our own code and workflows                       |
| OSV-Scanner                       | CI                                  | known vulnerabilities and malicious packages missing from `npm audit` |
| actionlint + zizmor               | CI (`repo-lint`)                    | broken or insecure workflows (injection, over-privileged tokens, cache poisoning, impostor commits) |
| gitleaks                          | CI (`secret-scan`)                  | committed secrets anywhere in the history                         |
| No dependency caches              | `deploy.yml`                        | cache poisoning of release builds                                 |
| CI tools pinned with checksums    | `.github/tools/`                    | tampered linters/scanners (Go checksum database, pip `--require-hashes`) |
| Actions pinned to commit SHAs     | `deploy.yml`                        | moved/compromised action tags                                     |
| SBOM + signed attestations        | `deploy.yml` (`verify`)             | undocumented components, tampered deployments (verify with `gh attestation verify`) |
| Content-Security-Policy           | `vite.config.ts`                    | injected or third-party scripts in the deployed app               |
| Least-privilege permissions       | `deploy.yml`                        | token misuse (`contents: read` by default, `persist-credentials: false`) |
| `min-release-age=7`               | `.npmrc`                            | freshly published malicious versions when installing/updating locally |
| Dependabot with cooldown          | `.github/dependabot.yml`            | outdated dependencies, action pins and CI tools; waits 7 (major: 14) days after a release |
| Weekly scheduled run              | `deploy.yml`                        | new advisories for dependencies that did not change               |
| `engine-strict`                   | `.npmrc`, CI                        | installing with an unsupported Node.js version                    |

Run the same checks locally with `npm run check:deps` and `npm run audit:ci`.

> CodeQL and dependency review are free for public repositories. For a private repository
> they require GitHub Advanced Security (Code Security); otherwise remove these jobs from
> `needs` of `deploy`.

## Base path

GitHub project pages are served from `/<repository>/`. The base path is configured in
`vite.config.ts` (`base: '/riddles/'`), and the manifest uses relative `start_url` and
`scope` (`./`). If the repository is renamed or a custom domain is used, change `base`
(and the manifest `id`) accordingly – for a custom domain at the root use `base: '/'`.

Routing uses hash URLs (`#/sudoku`), so no 404 fallback page is needed.

## Updates and caching

- Each build produces content-hashed assets and a new service worker with an updated
  precache manifest.
- Installed apps check for updates on start and every hour. When a new version is found,
  an *Update* banner appears; tapping it activates the new service worker and reloads.
- *Settings → About → Check for updates* checks immediately and, if a new version is found,
  downloads and activates it right away (logic in `src/core/update.ts`).
- Old caches are cleaned up automatically (`cleanupOutdatedCaches`).

## Release checklist

See the QA checklist in [plan/05-docs-release.md](../plan/05-docs-release.md#4-manual-qa-checklist-before-each-release).
Bump `version` in `package.json` (shown in Settings → About) and update the
[changelog](../CHANGELOG.md).

## Troubleshooting

| Symptom                                   | Fix                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| Blank page, 404 for assets                | `base` in `vite.config.ts` does not match the Pages path                     |
| Deploy job fails with "Pages not enabled" | Set *Pages → Source* to **GitHub Actions**                                   |
| Phone still shows the old version         | Close and reopen the app; tap *Update* when the banner appears               |
| iOS lost saved games                      | Safari may evict data of sites not opened for weeks – install to the home screen and use the backup export |
