# Riddles

[![CI & Deploy](https://github.com/stefanniedermaier/riddles/actions/workflows/deploy.yml/badge.svg)](https://github.com/stefanniedermaier/riddles/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Simple puzzle games for your phone – as an installable, offline-capable
**Progressive Web App**. No account, no backend, no tracking: everything stays on your device.
Every puzzle and level is generated on the fly.

**Play:** <https://stefanniedermaier.github.io/riddles/>

| Game       | What it is                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------ |
| **Sudoku** | Classic 9×9 number puzzle. Four difficulties, unique solutions, notes and hints that explain the next logical step. |
| **Crowns** | Place one crown in every row, column and coloured region – crowns may not touch, not even diagonally. Grid size grows with difficulty (6×6 to 10×10). |
| **Links**  | Connect each pair of coloured dots with a line – lines may not cross and every cell must be filled. 5×5 to 11×11, hints, undo, move counter. |
| **Shapes** | Match-3: swap neighbouring shapes to line up three or more. Zen, Time and Levels modes with special pieces and combos. |

## Features

- **Installable** on iOS and Android (home screen icon, full-screen, works offline)
- **Endless content** – puzzles are generated on the device, each with a unique solution
  and a difficulty rating based on the logic techniques it requires
- **Resume** any running game, **statistics** and personal bests
- **Backup**: export all data as a JSON file and import it on another device
- **German and English**, light and dark theme, reduced-motion support

## Install on your phone

| Platform              | Steps                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------- |
| **iPhone / iPad**     | Open the link in **Safari** → *Share* → **Add to Home Screen**                         |
| **Android**           | Open the link in **Chrome** → menu (⋮) → **Install app** / *Add to Home screen*        |

On Android (and desktop Chrome/Edge) the home screen also shows an **Install app** button;
on iPhone/iPad it explains the steps. After the first start the app works without an internet connection. When a new version
is published, the app shows an *Update* button.

## Development

Requirements: **Node.js 26** (current LTS, see [`.nvmrc`](.nvmrc)) and npm.

```bash
nvm use            # or install Node 26 in any other way
npm ci
npm run dev        # http://localhost:5173/riddles/ (also reachable from your phone in the same network)
```

| Script               | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Development server with hot reload                  |
| `npm test`           | Unit tests (Vitest); `npm run test:watch` to watch  |
| `npm run lint`       | ESLint                                              |
| `npm run type-check` | TypeScript / Vue type-check                         |
| `npm run build`      | Type-check and production build into `dist/`        |
| `npm run preview`    | Serve the production build (incl. service worker)   |
| `npm run icons`      | Regenerate app icons from `public/logo.svg`         |
| `npm run release:check` | Tag/version/changelog consistency before tagging a release |
| `npm run check:deps` / `audit:ci` | Supply-chain checks (lockfile, licenses, signatures, audit) |

Tech stack: Vue 3, TypeScript, Vite, vite-plugin-pwa (Workbox), Vitest.

## Documentation

- [Architecture](docs/architecture.md) – structure, core modules, how games plug in, storage keys
- [Development](docs/development.md) – setup, testing, conventions, adding a game or translation
- [Deployment](docs/deployment.md) – GitHub Pages, CI workflow, releasing a version, PWA updates
- [Privacy](docs/privacy.md) – what is stored and where
- [Security](docs/security.md) – threat model, supply chain, SBOM & provenance, CRA alignment
- Games: [Sudoku](docs/games/sudoku.md) · [Crowns](docs/games/crowns.md) · [Links](docs/games/links.md) · [Shapes](docs/games/shapes.md)
- [Implementation plans](plan/README.md) – the original design and decisions
- [Changelog](CHANGELOG.md)

## Security

Please report vulnerabilities privately – see [SECURITY.md](SECURITY.md). Every deployment
only happens after supply-chain, CodeQL and test gates pass, ships an SBOM and is covered by
signed build-provenance attestations ([details](docs/security.md)).

## Originality

The games implement well-known, generic puzzle mechanics. Names, artwork, colours and
layouts are original to this project.

## License

[MIT](LICENSE) © 2026 Stefan Niedermaier
