# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Statistics: overview (games played, completion rate, days played, day streak, solving
  time, favourite game) and per game an icon, last-played date and key figures; average score
  for score games
- Privacy notice in the app (Settings → Your data, link on the home screen)
- Share button on the home screen (share sheet or copy link)
- Rules button in Sudoku, Shapes, Merge and Blocks games, like in the other puzzles

### Changed

- Game rules are shown in a collapsible card (collapsed by default) – above the menu before
  the first game, below it afterwards – in all games, including Sudoku, Shapes and Blocks
- Mini Sudoku: the info text in the menu was removed

### Security

- CSP build plugin: robust inline-script detection (CodeQL js/bad-tag-filter)
- Web Worker RPC: origin and message-shape check (CodeQL js/missing-origin-check)

## [0.5.0] – 2026-11-22

### Added

- New game **Blocks**: place three pieces at a time on an 8×8 board and clear full rows and
  columns; combos, board-clear bonus, drag & drop with preview, tap-to-place and keyboard
- **Check** button in Sudoku, Nonogram and Crowns: highlights wrong entries and counts each
  mistake once; mistakes are shown in the result
- Settings button on every game's start page (not shown while a game is running)
- Settings → Game settings: pick a game, then change its options (deep link `?game=<id>`)
- Arrows: option *Colour by direction*
- Shapes: juice splashes, rocket beams and bomb shockwaves; points fly to the score

### Changed

- Shapes: new fruit-and-garden pieces (strawberry, orange, lemon, leaf, flower, grapes) in
  more saturated colours, rocket / bomb / rainbow-ball specials, wooden crates, acorn items
- Mistakes are no longer shown right away in Nonogram and Crowns (instant mode is an option,
  off by default)
- Arrows: all arrows share one colour by default (colours per direction gave the order away)
- Icons: Links endpoints aligned, Arrows icon redrawn without overlapping arrows
- Games plug in through one module list (`src/games/modules.ts`): registry, routes, texts
  and the `GameId` type are derived from it

## [0.4.0] – 2026-11-20

### Added

- New game **Arrows**: tap arrows in the right order so they slide off the board (6×6 to
  12×12, always solvable, 3 lives, hints, statistics)
- New game **Merge**: slide and merge number tiles on 3×3, 4×4 or 5×5 (targets 256 / 2048 /
  4096, keep playing afterwards), swipe and keyboard control, best score and highest tile
- New game **Nonogram**: 5×5 to 15×20, every puzzle unique and solvable by line logic,
  optional mistake check, explained hints, undo, statistics
- Settings → Games: show/hide games and change their order by drag & drop (keyboard: arrow
  keys on the handle); home screen, statistics and game settings follow the selection

## [0.3.1] – 2026-11-20

### Fixed

- Shapes: opening a mode without playing no longer leaves a permanent *Continue* on the home
  screen; Zen can be ended from the pause menu (*End game* records the score)

## [0.3.0] – 2026-11-20

### Security

- Patched `minimatch`/`glob` in build tooling via npm `overrides` (GHSA-g3hv-75wg-m249,
  GHSA-3g3m-2fjr-6pw4; development dependencies only, not shipped)

### Added

- New game **Links**: connect pairs of coloured dots, fill every cell (5×5 to 11×11,
  unique solutions, hints, undo, move counter with *perfect* rating)
- Sudoku: **Mini 6×6** mode (digits 1–6, 2×3 boxes) with its own difficulties, saves and
  statistics
- Sudoku and Crowns: **undo** (unlimited, saved with the game, Ctrl/Cmd+Z)
- Shapes levels: **obstacles and objectives** – chains, crates (1–2 hits), target tiles and
  drop items that have to reach the bottom row
- *Home* button in the result dialogs of all games

### Changed

- Shapes levels are played in a row: each won level unlocks the next one; no level select,
  stars or replays. Clearer level HUD (moves left, goal cards with progress)
- Game rules move below the menu once a game has been played (Crowns, Shapes)
- Home screen without the tagline

### Fixed

- Toasts no longer stack up or cover dialog buttons (only the newest is shown, below dialogs)
- Back button sometimes needed two taps (duplicate history entry after a finished game, and a
  late navigation after leaving a game while a puzzle was being generated)

## [0.2.0] – 2026-11-20

### Added

- *Install app* button on the home screen (native install dialog on Android/Chromium,
  step-by-step instructions on iOS/iPadOS); hidden when the app is already installed

### Changed

- Deployment is driven by the version number: only a signed tag `vX.Y.Z` (matching
  `package.json` and the changelog, on `main`) deploys and creates a GitHub Release with SBOM

### Fixed

- Crowns: crowns and marks no longer change the cell size and distort the board
- Crowns: taps and drags always hit the cell under the finger (browser hit testing instead
  of geometry that ignored the board border and uneven rows)
- Sudoku: grid rows and columns stay equal regardless of cell content

### Security

- CI deploys only after supply-chain checks (lockfile sources/integrity/licenses, registry
  signatures, npm audit), CodeQL and all tests pass; dependency review on pull requests
- GitHub Actions pinned to commit SHAs, least-privilege permissions
- Dependabot for npm and GitHub Actions with release cooldown; `min-release-age` and
  `engine-strict` in `.npmrc`
- CycloneDX SBOM (`/sbom.cdx.json`) and signed build-provenance/SBOM attestations per deployment
- Strict Content-Security-Policy and `no-referrer` policy in the production build
- SECURITY.md with private vulnerability reporting, security documentation incl. voluntary
  CRA alignment, issue/PR templates, CODEOWNERS
- Repository configuration as code (`scripts/github/configure-repo.sh`, `.github/rulesets/`)

## [0.1.0] – 2026-11-20

### Added

- Installable, offline-capable PWA shell (Vue 3, TypeScript, Vite, Workbox) for GitHub Pages
- Home, settings and statistics screens; German and English; light and dark theme;
  reduced-motion support
- Local persistence with resume, statistics and JSON backup export/import
- **Sudoku** with four difficulties, unique solutions, notes and explained hints
- **Crowns** (one crown per row, column and region) from 6×6 to 10×10
- **Shapes** match-3 with Zen, Time and Levels modes, special pieces and combos
- CI and deployment workflow for GitHub Pages
