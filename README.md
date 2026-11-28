# Riddles

[![CI & Deploy](https://github.com/stefanniedermaier/riddles/actions/workflows/deploy.yml/badge.svg)](https://github.com/stefanniedermaier/riddles/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Simple puzzle games for your phone – as an installable, offline-capable
**Progressive Web App**. No account, no backend, no tracking: everything stays on your device.
Every puzzle and level is generated on the fly.

**Play:** <https://stefanniedermaier.github.io/riddles/> · auf Deutsch: <https://stefanniedermaier.github.io/riddles/de/>

| Game       | What it is                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------ |
| **Sudoku** | Classic 9×9 number puzzle. Four difficulties, unique solutions, notes and hints that explain the next logical step. |
| **Stars**  | Place one star in every row, column and coloured region – stars may not touch, not even diagonally. Grid size grows with difficulty (6×6 to 10×10). |
| **Links**  | Connect each pair of coloured dots with a line – lines may not cross and every cell must be filled. 5×5 to 11×11, hints, undo, move counter. |
| **Nonogram** | Fill the grid so every row and column matches its number clues. 5×5 to 15×20, unique and solvable by logic, mistake check, hints, undo. |
| **Merge**  | Slide the tiles and merge equal numbers – reach 256, 2048 or 4096 on 3×3, 4×4 or 5×5 and keep going for a high score. |
| **Snake**  | Steer the snake, eat and grow without biting yourself – Classic, Open and Maze, three speeds and a calm mode that moves step by step. |
| **Bubbles** | Aim, bounce your bubble off the walls and pop three or more of a colour – Endless, Levels with goals and stars, and against the clock. |
| **Blocks** | Place three pieces at a time on an 8×8 board and clear full rows and columns – combos and a cleared board earn bonus points. |
| **Arrows** | Tap the arrows in the right order – an arrow only slides out if its way is free. 6×6 to 12×12, always solvable, 3 lives, hints. |
| **Mines**  | Reveal every cell without a mine – numbers count the mines around a cell. Every board is solvable by logic alone, no guessing. 8×10 to 12×18, hints that explain the next step. |
| **Pipes**  | Turn the tiles until the water from the source reaches every pipe – no open ends. 5×5 to 8×10, Expert with three sources, lock tiles, undo, hints. |
| **Water Sort** | Pour coloured water from tube to tube until every tube holds one colour. 4 to 12 colours, always solvable, unlimited undo, hints. |
| **Code Breaker** | Crack the hidden colour code – dots tell you how many pegs are right. 4 to 6 pegs, 6 to 8 colours with shapes, hints. |
| **Solitaire** | The classic patience: draw 1 or 3, unlimited or limited passes, time or points, solvable deals, hints. |
| **Spider** | Two decks, ten columns, runs from king to ace – 1, 2 or 4 suits. |
| **FreeCell** | All cards open, 4, 3 or 2 free cells – patience by pure logic, every deal solvable. |
| **TriPeaks** | Clear three peaks with cards one higher or lower; streaks and peak bonuses in points mode. |
| **Shapes** | Match-3 with fruit-and-garden pieces: swap neighbours to line up three or more. Zen, Time and Levels modes with special pieces and combos. |

## Features

- **Installable** on iOS and Android (home screen icon, full-screen, works offline)
- **Endless content** – puzzles are generated on the device, each with a unique solution
  and a difficulty rating based on the logic techniques it requires
- **Resume** any running game, **statistics** and personal bests
- **Backup**: export all data as a JSON file and import it on another device
- **Your selection**: show, hide and reorder games (drag & drop in the settings)
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
| `npm run test:e2e`   | E2E + accessibility tests (Playwright, axe) of the production build |
| `npm run lint`       | ESLint                                              |
| `npm run type-check` | TypeScript / Vue type-check                         |
| `npm run build`      | Type-check and production build into `dist/`        |
| `npm run preview`    | Serve the production build (incl. service worker)   |
| `npm run icons`      | Regenerate app icons from `public/logo.svg`         |
| `npm run release:check` | Tag/version/changelog consistency before tagging a release |
| `npm run check:deps` / `audit:ci` | Supply-chain checks (lockfile, licenses, signatures, audit) |
| `npm run knip` / `check:dist` | Unused files/dependencies; build output checks (CSP, size budgets) |

Tech stack: Vue 3, TypeScript, Vite, vite-plugin-pwa (Workbox), Vitest, Playwright.

## Documentation

- [Architecture](docs/architecture.md) – structure, core modules, how games plug in, storage keys
- [Development](docs/development.md) – setup, testing, conventions, adding a game or translation
- [Design guide](docs/design-guide.md) – colours, shapes, game art, lobbies, motion and accessibility for app and games
- [Deployment](docs/deployment.md) – GitHub Pages, CI workflow, releasing a version, PWA updates
- [Privacy](docs/privacy.md) – what is stored and where
- [Security](docs/security.md) – threat model, supply chain, SBOM & provenance, CRA alignment
- Games: [Sudoku](docs/games/sudoku.md) · [Stars](docs/games/crowns.md) · [Links](docs/games/links.md) · [Nonogram](docs/games/nonogram.md) · [Arrows](docs/games/arrows.md) · [Shapes](docs/games/shapes.md) · [Merge](docs/games/merge.md) · [Blocks](docs/games/blocks.md) · [Snake](docs/games/snake.md) · [Bubbles](docs/games/bubbles.md) · [Mines](docs/games/mines.md) · [Pipes](docs/games/pipes.md) · [Water Sort](docs/games/watersort.md) · [Code Breaker](docs/games/codebreaker.md) · [Card games](docs/games/cards.md): [Solitaire](docs/games/solitaire.md), [Spider](docs/games/spider.md), [FreeCell](docs/games/freecell.md), [TriPeaks](docs/games/tripeaks.md)
- [Implementation plans](plan/README.md) – the original design and decisions
- [Changelog](CHANGELOG.md)

## Accessibility

Riddles aims at WCAG 2.2 AA: high contrast in both themes, colour never the only cue,
keyboard play, screen reader labels, reduced motion and two-finger zoom. Details, known
limitations and how to report a barrier: [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Contributing

Bug reports, ideas and pull requests are welcome – see [CONTRIBUTING.md](CONTRIBUTING.md).
Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please report vulnerabilities privately – see [SECURITY.md](SECURITY.md). Every deployment
only happens after supply-chain, CodeQL and test gates pass, ships an SBOM and is covered by
signed build-provenance attestations ([details](docs/security.md)).

## Originality

The games implement well-known, generic puzzle mechanics. Names, artwork, colours and
layouts are original to this project.

## License

[MIT](LICENSE) © 2026 Stefan Niedermaier
