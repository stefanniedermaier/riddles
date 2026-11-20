# Deployment

The app is deployed to **GitHub Pages** by the workflow
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

URL: <https://stefanniedermaier.github.io/riddles/>

## One-time setup

1. Push the repository to GitHub.
2. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. (Optional) *Settings → Environments → github-pages*: restrict deployments to `main`.

## Workflow

| Trigger              | Jobs                                                                |
| -------------------- | ------------------------------------------------------------------- |
| Pull request         | `build`: install, lint, type-check, test, build                     |
| Push to `main`       | `build` + upload of `dist/` as Pages artifact, then `deploy`        |
| Manual (`workflow_dispatch`) | same as push                                                |

Node is installed from `.nvmrc`, dependencies with `npm ci` (lockfile required).

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
