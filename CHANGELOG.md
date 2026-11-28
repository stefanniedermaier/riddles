# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Bubbles** – the 18th game, a bubble shooter: drag to aim, let go to shoot, bounce off the
  walls and pop three or more of a colour; everything that no longer hangs on the ceiling
  falls. Three modes: *Endless* (a new row after a few misses), *Levels* (generated levels
  with a goal, a shot limit and 1–3 stars – every level checked solvable by a bot) and
  *Against the clock* (the ceiling comes down on a clock, three speeds, pauses by itself).
  Earned bombs and rainbow bubbles, stones that only fall. Colour and symbol on every bubble
  (symbols can be switched off), an aim line in three lengths, full keyboard control and
  reduced motion. Plan 23.

## [0.14.1] – 2026-11-26

Hotfix: the sitemap and other files open directly again in a browser that has the app.

### Fixed

- Files opened directly in a browser that already has the app (the sitemap, the licence
  notices, a preview image) showed the app's not-found page until the page was reloaded:
  the service worker answered every address with the app. It now leaves addresses with a
  file extension to the network.

## [0.14.0] – 2026-11-26

Snake as the 17th game, real addresses and German pages for search engines and link
previews, a faster start and fixes for players with zoom and reduced motion.

### Search engines and link previews (plan 21)

- **Real addresses:** every game has its own page – `/riddles/sudoku/` instead of
  `#/sudoku` – and every page exists in German too (`/riddles/de/…`). Old links (`#/…`,
  shared challenges, bookmarks, installed apps) keep working and are rewritten on start.
- **Stars** lives at `/stars/`; `/crowns` redirects.
- Every page is prerendered with its own title, description, canonical address, language
  alternates, link preview (image and text) and structured data, plus a short readable
  description and the rules – visible to search engines and link previews without
  JavaScript. A sitemap lists all pages.
- Shared challenge links point to the page in the sharer's language and show a preview
  with the game's logo.
- New description of the app (17 games instead of "Sudoku, Crowns and Shapes").
- Google Search Console verification.

### Added

- **Snake** – the 17th game and the first in real time: steer the snake, eat and grow
  without biting yourself. Three modes (Classic, Open with walls that lead to the other
  side, Maze with stones), three speeds that pay more points the faster they are, and a
  *Calm* speed that moves one step per input – no time pressure, with screen reader
  announcements. Swipe, direction buttons (on by default on touch screens) or keys; the game
  pauses by itself and never moves on without you. Reduced motion moves the snake cell by
  cell.
- Community files: [Code of Conduct](CODE_OF_CONDUCT.md) (Contributor Covenant 2.1),
  [Contributing guide](CONTRIBUTING.md), [Accessibility statement](ACCESSIBILITY.md) and an
  issue template for accessibility barriers; the bug report lists every game.

### Changed

- Faster start: the app loads only the texts of the language it shows (the other language
  follows when you switch, also offline), and the start page's code is one file instead of
  thirty small ones – 80 instead of 97 kB to load on the first visit.
- Shapes: rockets and the bomb no longer cover their fruit. A rocket is drawn in the colour
  and texture of its fruit (seeds, pores, the lemon tip, veins, petals, berries) and points
  the way it clears; the bomb is now a bundle of dynamite in the fruit's look, with black
  tape, fuse and flame. The kind to match stays visible at a glance, also without colour
  vision.
- Result dialog: "Share" is an icon button in the top right corner; "Game menu" and "Home"
  are icon buttons side by side in the same look in every game (named for screen readers),
  below the game's own actions. The menu is offered in every result, also after a lost
  round and after a mine hit.
- The header at the top is fully opaque; nothing scrolling underneath shows through.
- Installed app on Android: the manifest has dark system-bar colours (`color_scheme_dark`), so
  the navigation bar can turn dark while the phone is in dark mode – where the browser
  supports it, after Chrome updates the installed app (or after reinstalling it).
- Play views get their route values (`?new=`, variant / mode) as props instead of reading the
  route themselves.

### Fixed

- Shapes with reduced motion (e.g. Android's "Remove animations"): a move is shown step by
  step – the swap, the matched pieces fading, the refill – instead of jumping straight to
  the final board, which made one swap look as if half the board changed by itself.
- All games: a second finger on the board (e.g. a pinch to zoom in) no longer plays – no
  swap in Shapes, no move in Merge, no tap or long press in Mines, Pipes and Arrows, no
  stroke in Links, Nonogram and Stars, no drag in Blocks and the card games. Two-finger zoom
  now works on the boards too.
- "Share result" after a Blocks or Merge game (and Shapes Zen / Time) also without a new
  personal best: these games simply end with a score.
- Statistics no longer scroll sideways on narrow phones (e.g. Galaxy S21 FE); a wide table
  scrolls on its own.

## [0.13.2] – 2026-11-25

Hotfix release with the app-wide QA and cleanup (plan 20): accessibility, lifecycle fixes,
battery and performance, keyboard play in Links and Shapes.

### Changed

- The puzzle games share one lobby; "New game", the replace-game question and its buttons now
  read the same in every game (also in the card games, Sudoku and Blocks).
- Dialogs: Tab stays inside an open dialog and the page behind it can no longer be reached
  (also not by screen readers); Escape closes only the topmost dialog; every dialog has an
  accessible name (also the result and untitled confirm dialogs).
- Dark mode: text and icons on a game colour are dark (rules icon, Blocks banner were white on
  a light game colour).
- Touch targets of at least 44 px for the dialog and hint close buttons, the Mines and
  Nonogram tools and segmented buttons.
- Sudoku: leaving while a puzzle is being generated no longer counts a started game or saves
  it.
- Stars, Links, Nonogram, Shapes: a result dialog or score update still pending when leaving
  the game no longer fires afterwards.
- Pipes and Water Sort: Ctrl/⌘+Z undoes, like in the other games.
- Stars, Links, Nonogram, Sudoku: merely opening a puzzle no longer saves it or counts it as
  started – like in the other games, a game counts (and the menu offers *Continue*) only after
  the first move. The started/solved numbers in the statistics are now comparable.
- Home no longer shows *Continue* for a stored game that the game itself cannot load (e.g.
  from an old version).
- Battery: Water Sort's liquid only moves in the picked-up tube and briefly after a pour; the
  garden behind Shapes and its special pieces rest while a dialog is open or nobody plays;
  game clocks redraw once per second instead of five times; puzzle generators are shut down
  after 30 s without work.
- Smoother dragging of cards (no re-render of the table per pointer move) and Blocks pieces;
  the app bar no longer blurs the page scrolling under it.
- A puzzle generator that hangs is replaced after 60 s and the puzzle is made on the main
  thread instead.
- Installed app: also looks for a new version when it comes back to the foreground (at most
  every 30 minutes).
- Correct singular forms: "1 card", "1 mine left", "1 deal left", "1 block" and so on (also
  in German).
- Shapes: the result dialog offers *Share result* again.
- Card games turn to the landscape layout when the phone is rotated, also in the installed
  app on Android (the manifest no longer locks portrait; portrait is requested at runtime).
- Theme "System": browser and status bar colours follow the phone's dark mode right from
  the start (one theme colour per system theme).
- The win dialog fits on a phone screen without scrolling: results in two columns, actions
  side by side, the shared image is no longer shown in it (it is still shared along).
- Keyboard play in Links (arrow keys move a cursor, Enter or Space starts and ends a line,
  arrows draw) and Shapes (arrow keys move a cursor that reads out the piece, Enter or Space
  picks a piece and swaps it with a neighbour).
- Radio groups and tabs (segmented buttons, the Mines and Nonogram tools, the game picker in
  the settings) are one tab stop; arrow keys, Home and End choose.
- After a page change the keyboard focus moves to the page heading (screen readers read it)
  and the browser tab shows the page name.
- Mines and Nonogram tools look like the other segmented buttons.
- Sudoku and Stars share one hint card.
- Reduced motion also stops animations that lacked their own switch.
- Snackbars (e.g. after *Share result*) appear above an open dialog instead of behind its
  dimmed backdrop.
- The home page draws the gradients of the 16 game logos once instead of once per logo
  (12 instead of ~200 gradient definitions); Stars and Shapes obstacles likewise.
- Sudoku keeps at most 500 undo steps in the save (it grew without bound before).

## [0.13.1] – 2026-11-25

The tag `v0.13.0` was set before the release was prepared and never published; 0.13.1 is
the first release with these changes.

### Added

- *Share result* in the win dialog of every game: shares a challenge link (game, difficulty,
  time or points). The link opens the game's lobby with a challenge note and the difficulty
  marked – it never replaces a running game. Installed apps open such links where the browser
  supports it (`handle_links`, `launch_handler`).
- The shared result comes with an image (1080 × 1080): golden trophy, game logo, difficulty,
  result and a "personal best" badge; shown as a preview in the win dialog.
- Plan 19: evaluation of shared puzzles via seed links.
- Design guide (`docs/design-guide.md`) for the app and all games.
- Shapes in a garden look: glossy pieces, a garden scene behind the board, a wooden board
  frame and a game-style HUD. Particles when pieces pop and obstacles break, pieces squash when
  they land, the board shakes for bombs, praise for cascades ("Great!"). Garden-bed target
  tiles, chains with a padlock; after a lost level the pieces tumble off the board. The rules
  show every special and obstacle with a label.
- End of a game: wins are celebrated with confetti, rays and popping stars; a lost game gets
  a little rain cloud and a soft shower.
- Every lobby has a banner in its game's colour and a matching background motif.
- Water Sort: test tubes with a lip, shaded liquid with wavy, moving borders between the
  colours, an animated pour (the tube flies over, tilts and pours) and a cork on finished tubes.
- Inside a game (lobby and play view) buttons, selections and highlights use the game's colour
  instead of the app's violet. One "Continue" bar for all lobbies; square mode cards with a
  plain play triangle.
- Mines: glossy meadow tiles on sand (higher contrast), new flag and mine artwork.
- Stars: glossy golden stars on flat region tiles, a sparkle when a star is placed and a
  livelier win animation.
- Game logos share one look (square tiles with a glaze; Stars, Mines, Water Sort, Code
  Breaker, Blocks and Shapes redrawn in their game's style; Solitaire, Spider and FreeCell got
  their own motifs). Square corners on the home screen, mode cards, rules and switches.
- Water Sort: when several layers are poured, they fill up one after the other, bottom up.

### Changed

- Material Design with square corners for the whole UI (games' boards and pieces excepted):
  elevation levels, state layers and a ripple on all controls, Material 3 buttons (filled,
  outlined, text), switches, segmented buttons with a check mark and a snackbar.
- Settings → Games: hidden games move into a collapsible "Hidden games" list below the
  sortable list (shorter page); showing a game again puts it back at its old place.

### Fixed

- Settings on desktop: the game picker under *Game settings* scrolls with the mouse wheel and
  can be dragged with the mouse; reordering games scrolls the page when dragging near the
  edge or with the wheel.

## [0.12.0] – 2026-11-25

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

- Pipes: Expert is now a 7×8 board with **three sources** – each network has its own colour
  and number, and networks must not connect. The old 10×12 board was too fiddly on phones;
  saved 10×12 games are discarded.
- Size budget for all JavaScript/CSS raised from 280 to 360 kB (gzip) for the card games.

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
