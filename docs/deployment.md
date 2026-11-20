# Deployment

The app is deployed to **GitHub Pages** by the workflow
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

URL: <https://stefanniedermaier.github.io/riddles/>

## One-time setup

1. Push the initial history to `main`.
2. Apply the repository configuration (Pages via Actions, environment restricted to `main`,
   security features, Actions policy, rulesets – see [security §4](security.md#4-repository-configuration)):

   ```bash
   scripts/github/configure-repo.sh
   ```

   The script is idempotent; rerun it after changing `.github/rulesets/*.json`.
3. From now on every change goes through a pull request with signed commits.

## Workflow

```
pull request:  dependency-review ─┐
                                  ├─ (no deploy)
               supply-chain ──────┤
               codeql ────────────┤
               verify ────────────┘

push to main:  supply-chain ──┐
               codeql ────────┼──▶ deploy (GitHub Pages)
               verify ────────┘    only if all three succeed
```

| Job                 | When        | Checks                                                                                       |
| ------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `dependency-review` | PRs         | New/updated packages: no known vulnerability ≥ moderate, license on the allow list, OpenSSF Scorecard warning |
| `supply-chain`      | always      | `scripts/check-dependencies.mjs` (see below), `npm ci --ignore-scripts`, `npm audit signatures`, `npm audit` (runtime: no vulnerability ≥ moderate; all: none ≥ high) |
| `codeql`            | always      | CodeQL `security-extended` analysis of the TypeScript/Vue code and the workflow files        |
| `verify`            | always      | lint, type-check, unit tests, production build, clean working tree, upload of `dist/`         |
| `deploy`            | `main` only | publishes the uploaded artifact – needs `supply-chain`, `codeql` and `verify` to succeed      |

### Supply-chain safeguards

| Safeguard                         | Where                               | Protects against                                                  |
| --------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| Lockfile check                    | `npm run check:deps`                | packages from other registries, git/URL/file dependencies, missing sha512 integrity, non-permissive licenses in shipped code |
| `npm ci --ignore-scripts`         | CI                                  | exact lockfile versions only; no install scripts executed         |
| `npm audit signatures`            | CI, `npm run audit:ci`              | tampered packages (registry signatures, Sigstore provenance)      |
| `npm audit`                       | CI, `npm run audit:ci`              | known vulnerabilities                                             |
| Dependency review                 | PRs                                 | vulnerable or unexpectedly licensed new dependencies              |
| CodeQL                            | CI                                  | security bugs in our own code and workflows                       |
| Actions pinned to commit SHAs     | `deploy.yml`                        | moved/compromised action tags                                     |
| SBOM + signed attestations        | `deploy.yml` (`verify`)             | undocumented components, tampered deployments (verify with `gh attestation verify`) |
| Content-Security-Policy           | `vite.config.ts`                    | injected or third-party scripts in the deployed app               |
| Least-privilege permissions       | `deploy.yml`                        | token misuse (`contents: read` by default, `persist-credentials: false`) |
| `min-release-age=7`               | `.npmrc`                            | freshly published malicious versions when installing/updating locally |
| Dependabot with cooldown          | `.github/dependabot.yml`            | outdated dependencies and action pins; waits 7 (major: 14) days after a release |
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
