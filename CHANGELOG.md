# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Four card games on a shared card engine: **Solitaire** (draw 1 or 3, unlimited or limited
  passes), **Spider** (1, 2 or 4 suits), **FreeCell** (4, 3 or 2 free cells) and **TriPeaks**.
  Original card design, drag & drop or tap, full keyboard support, unlimited undo, hints from a
  solver, *Only solvable deals*, scoring by **time or points**, optional four-colour suits.
- Statistics show best time and high score for the card games.
- Card games in landscape: a wide layout with stock and foundations beside the columns, card
  size also fitted to the height (no page scrolling), status and toolbar at the side on low
  screens; long columns are squeezed further before the table scrolls. The installed app may
  rotate to landscape in the card games (elsewhere it stays in portrait).

### Changed

- Pipes: the Expert level (10×12) is gone – too fiddly on phones. Saved Expert games are
  discarded.
- Size budget for all JavaScript/CSS raised from 280 to 360 kB (gzip) for the card games.

### Fixed

- Card games: the rules dialog was partly covered by cards.
- TriPeaks: the Medium label and the rules say that ace and king do not connect there.

## [0.11.0] – 2026-11-24

### Added

- New game **Mines**: reveal every cell without a mine, numbers count the mines around a
  cell. Every board is generated so that it can be solved by logic alone – no guessing.
  Four difficulties (8×10 to 12×18), pre-opened start area, *Reveal*/*Flag* tool with long
  press for the other action, chord on numbers, hints that explain the next logical step,
  *Check* for wrong flags, and *Undo move* after a mine hit (counts as a mistake).
- New game **Pipes**: turn the tiles until the water reaches every pipe without open ends.
  5×5 to 10×12, lock tiles with a long press, undo and hints.
- New game **Water Sort**: pour coloured water between tubes until every tube holds one
  colour. 4 to 12 colours, every level checked by a solver, unlimited undo, hints that always
  lead to the goal, letters on the layers (can be turned off).
- New game **Code Breaker**: find the hidden colour code from the dots after each guess.
  Four difficulties (4–6 pegs, 6–8 colours), every colour with its own shape, hints that fill
  in a code fitting all clues, optional guess check and count of possible codes.

## [0.10.0] – 2026-11-23

### Added

- Imprint page (home screen footer and Settings → About)
- Settings → About → *Third-party licences*: licence notices of all bundled open-source
  packages (`licenses.txt`, generated at build time and checked by `check-dist`)

### Changed

- *Crowns* is now **Stars**: stars instead of crowns, vivid and clearly distinguishable
  region colours in both themes (stars and marks keep at least 4.5:1 contrast), new star tile
  in the app icon. Saved games and statistics are kept.
- Privacy notice: legal basis for storing data on the device (§ 25 TDDDG), transfer of
  connection data to the USA (GitHub) and storage duration

## [0.9.1] – 2026-11-23

Version 0.9.0 was not released (its tag was pushed before the version bump).

### Added

- Privacy notice: controller details (name, postal address, email) as required by the GDPR,
  legal basis of the hosting and the data subject rights incl. the right to lodge a complaint

### Changed

- Nonogram: the 15×15 and 15×20 grids are gone (too small to tap on phones); *Hard* is now
  10×15 (portrait), *Expert* is no longer offered. Running games of the removed sizes are
  discarded.
- Links: new 12-colour palette with clearly distinguishable colours in both themes
  (letters A–L), fewer colours per puzzle (Hard 7–9, Expert 10–12)
- Shapes: the home screen no longer shows *Continue* for a running Zen game

## [0.8.0] – 2026-11-23

### Added

- Settings → About: *Check for updates* looks for a new version right away and installs it
  directly (or reports that the app is up to date)

- CI: end-to-end and accessibility tests (Playwright + axe, WCAG 2.2 AA) of the production
  build on desktop and mobile, in light and dark mode, including an offline start
- CI: workflow lint (actionlint, shellcheck) and workflow security audit (zizmor),
  `.editorconfig` check, secret scan of the full history (gitleaks), OSV-Scanner as a second
  vulnerability database, unused code and dependencies (knip), build output checks (CSP, no
  source maps or `eval`, size budgets) and a weekly scheduled run

### Fixed

- Accessibility: higher text contrast for game taglines and the *Delete all data* button
  (light theme), label for the backup file input

### Security

- CI: no dependency caches in jobs that build release artifacts (cache poisoning)

## [0.7.0] – 2026-11-23

### Changed

- The share button uses the share icon of the operating system: a box with an upward arrow on
  Apple devices, three connected nodes on Android, Windows and others.
- Sudoku: "How to play" describes the selected grid (9×9 with 3×3 boxes or 6×6 with 2×3 boxes).
- Arrows: a freed arrow now slides out along its own path – the head flies ahead, the tail follows
  the bends and the arrow leaves the board as a straight line.

## [0.6.0] – 2026-11-23

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
