# Plan 05 – Documentation & release

## 1. Repository documents

| File                     | Content                                                                |
| ------------------------ | ---------------------------------------------------------------------- |
| `README.md`              | What it is, games, install on iOS/Android, development, deployment     |
| `LICENSE`                | MIT                                                                    |
| `docs/architecture.md`   | Structure, core modules, game plug-in contract, data flow, storage keys |
| `docs/development.md`    | Prerequisites, scripts, testing, adding a game, i18n, conventions      |
| `docs/deployment.md`     | GitHub Pages setup, workflow, base path, PWA update behaviour          |
| `docs/games/sudoku.md`   | Rules, generator & grading, techniques, hints                          |
| `docs/games/crowns.md`   | Rules, generator, uniqueness repair, logic levels                      |
| `docs/games/shapes.md`   | Rules, specials, scoring, modes, level generation                      |
| `docs/privacy.md`        | No backend, no tracking; what is stored locally; export/import          |
| `CHANGELOG.md`           | Keep-a-Changelog format, starting with 0.1.0                           |

## 2. Icons

- `public/logo.svg` – original app logo (grid with a crown and shapes motif).
- `npm run icons` (`@vite-pwa/assets-generator`, preset `minimal-2023`) generates
  `favicon.ico`, `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`,
  `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`. Generated files are committed.

## 3. Deployment

1. Repo settings → Pages → Source: **GitHub Actions** (one-time).
2. Push to `main` → workflow builds, tests and deploys to
   `https://stefanniedermaier.github.io/riddles/`.
3. Installed apps pick up new versions via the update banner.

## 4. Manual QA checklist (before each release)

- [ ] Android Chrome: install banner / "Add to home screen", standalone launch, icon.
- [ ] iOS Safari: Share → "Add to Home Screen", standalone launch, status bar, safe areas.
- [ ] Offline: airplane mode → app and all three games open; new puzzles generate.
- [ ] Update: deploy a new version → update banner appears → reload keeps running games.
- [ ] Each game: new game per difficulty/mode, resume after reload, win/finish dialog,
      statistics updated.
- [ ] Settings: language, theme, motion; export → reset → import.
- [ ] 360 px width, landscape on tablet, dark mode contrast.

## 5. Versioning

SemVer; version shown in Settings → About (injected from `package.json` at build time).
Deployment is triggered by a signed tag `vX.Y.Z` that matches `package.json` and has a
changelog section (see docs/deployment.md#releasing-a-new-version).
v0.1.0 = first complete release with all three games.
