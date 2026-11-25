# 20 – QA & cleanup

**Status:** done. All 8 phases are implemented; open on purpose: 4.10 (per-game catalogues), parts of 6.3/6.5 (card view session, Mines hints, backdrop motifs), see the done notes.

A review of the whole app (architecture, UI/CSS/accessibility, performance/mobile, code
quality/tests/tooling) after v0.12.0 and the garden-look release. The codebase is in good
shape – no `any`, no `@ts-ignore`, every persisted value is validated, en/de catalogues are
in sync, all routes are lazy, listeners and observers are cleaned up, heavy generators run in
workers. The main debt: the puzzle games' lobby and play views are copy-pasted and the copies
have drifted into real behaviour differences.

Effort: **S** ≤ half a day, **M** 1–2 days, **L** more.

## Phase 1 – Accessibility quick wins (S) ✅

| # | Item | Where |
| -- | -- | -- |
| 1.1 | Dialogs trap focus: Tab cycles inside the panel, the rest of the app is `inert` while a dialog is open. | `AppDialog.vue` |
| 1.2 | Dialogs are named by their heading (`aria-labelledby`); dialogs without a title get one via a new `label` prop (result dialog, confirm dialogs). No empty `<h2>`. | `AppDialog.vue`, `ResultDialog.vue`, `ConfirmDialog.vue` |
| 1.3 | Escape closes only the topmost dialog (dialog stack instead of one document listener per instance). | `AppDialog.vue` |
| 1.4 | Text on a game colour uses a theme-aware `--on-game` token (dark text in dark mode, as the design guide asks). Fixes white on light orange in dark mode (rules icon, Blocks banner). | `tokens.css`, `RulesCard.vue`, `BlocksPlay.vue`, `ContinueButton.vue`, `ChoiceList.vue`, `HomeView.vue` |
| 1.5 | Touch targets ≥ `--tap-min` (44 px): dialog close, hint close, tool buttons, segmented buttons. | `AppDialog.vue`, `HintPanel.vue`, `CrownsPlay.vue`, `MinesPlay.vue`, `NonogramPlay.vue`, `SegmentedControl.vue` |

## Phase 2 – Behaviour bugs (S) ✅

| # | Item | Where |
| -- | -- | -- |
| 2.1 | Sudoku: leaving while a puzzle is generated no longer records a start, writes a save or starts a stopwatch that is never stopped (cancellation token like the other games). | `sudoku/useSudokuGame.ts` |
| 2.2 | The delayed result dialog timers are cleared when leaving the game. | `CrownsPlay.vue`, `LinksPlay.vue`, `NonogramPlay.vue`, `ShapesPlay.vue` |
| 2.3 | Ctrl/⌘+Z undoes in Pipes and Water Sort (both have undo; the other games already support the shortcut). | `PipesPlay.vue`, `WaterSortPlay.vue` |

## Phase 3 – Shared lobby and save slots (S) ✅

| # | Item | Notes |
| -- | -- | -- |
| 3.1 | `components/PuzzleLobby.vue` replaces the 8 copy-pasted lobbies (Arrows, Crowns, Links, Mines, Nonogram, Pipes, Water Sort, Code Breaker – ~100 lines each, 2–9 lines apart). Same pattern as `CardGameLobby.vue`. | ≈ −700 lines. Props: `game`, `variants`, `loadSave`, `savedLabel`, `variantDetail`, `rules`, `warm?`. |
| 3.2 | Shared lobby texts (`lobby.newGame`, `confirmNewTitle`, `confirmNew`, `start`) in the app catalogue instead of per game – they already drift (de: „geht verloren“ vs. „geht dabei verloren“, puzzle/game/board). | |
| 3.3 | `core/saveSlot.ts`: `defineSaveSlot<T>(key, guard) → { load, save, clear, exists }` with a **validating** `exists()`. Used by descriptor, lobby and play view. | Today Home uses unvalidated `has()` while the lobby validates → an invalid/old save shows "Continue" on Home but not in the lobby. Card save key is built in 3 places. |
| 3.4 | One rule for "started" in the statistics: **first move**. Today Crowns, Links, Nonogram and Sudoku count on generation, the others on the first move – started/finished numbers are not comparable. | |
| 3.5 | Do not persist untouched games (Crowns, Links, Nonogram, Sudoku): opening a puzzle must not make the lobby offer "Continue" and the replace-game confirm. | 3 different mechanisms today (`actions === 0`, `started` flag, none). |
| 3.6 | `core/migrations.ts`: one-off key migrations/removals run once from `main.ts` (`GameDescriptor.migrate`); remove orphaned old-version keys (they also end up in exports). | Replaces the import-time side effect in `shapes/store.ts`. The only old keys in the history are the two Shapes v1 keys. Settings stay unversioned: they are parsed field by field with defaults, so schema changes are tolerated. |

**Done notes.** Blocks, Merge, Shapes and the card games keep an unvalidated `hasSavedGame`:
their validators live in the game engines, which would have to move into the initial chunk.
Their Home badge and lobby agree as long as saves come from the current version (keys are
versioned); a slot can be added when an engine's save format changes.

## Phase 4 – Performance & battery (S–M) ✅

| # | Item | Notes |
| -- | -- | -- |
| 4.1 | Water Sort: the endless `bubbles` (`background-position`) and `wave` (`mask-position`) animations repaint every layer every frame (up to 48 layers × 2 on Expert). Animate `transform` on an oversized pseudo-element, or animate only the top layer / during a pour; pause while a dialog is open. | `WaterSortBoard.vue:386,404,433` |
| 4.2 | Shapes never idles: butterfly wings (0.28 s, SVG child transforms), rocket flame, bomb spark, prism spin, arrow bob with `drop-shadow`, clouds, hint pulse; `will-change: transform` on all 64 pieces. Pause the backdrop while a dialog is open / after ~10 s idle, bake the arrow shadow, set `will-change` only while moving. | `GardenBackdrop.vue`, `ShapePiece.vue`, `ShapesBoard.vue` |
| 4.3 | Card drag re-renders the whole table per `pointermove` (Spider: 104 cards × `find` + `t()` lookups). Keep only `{pile, index}` reactive, write the offset as CSS variables; precompute aria labels and the hint card. | `CardTable.vue:152-216,331-350` |
| 4.4 | Terminate idle generator workers ~30 s after the last request (12 workers stay alive forever; iOS kills memory-heavy PWAs). Add a request timeout that falls back to the main thread. | `core/worker.ts` |
| 4.5 | App bar: drop `backdrop-filter: blur()` (background is 88 % opaque anyway) or enable it only when scrolled. | `AppBar.vue:54` |
| 4.6 | Blocks drag ghost: `transform: translate3d()` instead of `left`/`top`. | `BlocksPlay.vue:524,713` |
| 4.7 | Stopwatch: render whole seconds (`computed`) instead of re-rendering the play view 5×/s; stop the countdown check interval while paused. | `core/timer.ts` |
| 4.8 | Shapes animator: abortable `play()` chain so callbacks (`addShownScore`, …) do not run after leaving. | `shapes/animator.ts` |
| 4.9 | Check for app updates also on `visibilitychange` (throttled), not only hourly – suspended installed apps rarely run the interval. | `core/update.ts` |
| 4.10 | Load game texts with the game module (or per language) instead of in the initial chunk (91.8 of 100 kB gzip budget). | `i18n/index.ts` – **deferred**, see below. |

**Done notes.**
- 4.1: the liquid moves only in the picked-up tube and for a few seconds after a pour (an idle
  board now runs no animation at all, before: up to 96).
- 4.2/4.8: `core/stillness.ts` sets `<html data-still>` while a dialog is open or after 15 s
  without input; decorative loops (clouds, butterflies, fuse, flames, prism, arrow) pause on
  it. Feedback animations (hint pulse, selection) keep running. The butterfly wings stay SVG
  child animations, but they rest whenever the player does.
- 4.7: `useStopwatch` reads exactly but notifies once per second (countdowns every 100 ms).
- 4.10 deferred: the game texts are ~17 kB gzip of the initial chunk, but Home (names,
  taglines), statistics (variant labels) and sharing need every game's texts at start, so a
  per-game split needs a name/variant part per game; a per-locale split needs each game's
  `i18n.ts` split into `en`/`de` files. Revisit when the budget gets tight (7.6 kB left).

## Phase 5 – Tooling & type safety (S–M) ✅

| # | Item | Notes |
| -- | -- | -- |
| 5.1 | knip rules to `error` and remove the 62 unused exports and 19 unused exported types. | `knip.json` – today knip never fails CI. |
| 5.2 | Type-aware ESLint (`recommendedTypeChecked`), `no-floating-promises`, `no-misused-promises`, `consistent-type-assertions`, `switch-exhaustiveness-check`, an import-order rule. | A strict trial run: 709 messages (599 `!`, 42 unnecessary conditions, 27 no-op casts, 1 async `onmessage` in `core/worker.ts`, deprecated `scrollBehavior` in `router.ts`). |
| 5.3 | Move types exported from `.vue` files to `.ts` (`Bump`, `Ghost`, `BoardHighlight`, `Pour`) – type-aware tools see them as `any`. | |
| 5.4 | Plural forms in `t()` via `Intl.PluralRules` (`{ one, other }`). Fixes "1 cards", "1 won", "{cells} blocks"; replaces the `checkOne`/`checkMany` workaround. | `core/i18n.ts` |
| 5.5 | Typed game texts and IDs: `gameText(id: GameId, 'name' \| 'tagline')` instead of 5× `` t(`${game}.name` as 'sudoku.name') ``; `GameId` instead of `string` in `core/stats.ts`, `core/settings.ts`, `GameDescriptor`. | |
| 5.6 | Further tsconfig flags: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitOverride`; an `at()`/`must()` helper for non-hot `!` assertions. | |

**Done notes.**
- 5.1: 82 exports were only used in their own module (export removed); 11 symbols were dead
  (deleted). knip rules are `error`, so CI fails on new unused exports.
- 5.2: `recommendedTypeChecked` plus `switch-exhaustiveness-check` and
  `consistent-type-assertions`; 53 findings fixed (mostly no-op casts). Off where they misfire:
  `no-redundant-type-constituents` (generic `S | null`), `no-unnecessary-type-assertion` in
  `.vue` files (typescript-eslint misreads `<script setup generic>`), and a few rules in tests.
  **Not done:** an import-order rule – it needs a new dev dependency (`eslint-plugin-import-x`
  or `perfectionist`); decide separately. Lint takes ~20 s instead of ~5 s.
- 5.4: `{count|one|other}` in messages, chosen with `Intl.PluralRules`; used where a count can
  be 1 (cards in a pile, mines left, Spider deals, Blocks piece sizes, Sudoku preparation
  steps, Shapes goals). `checkOne`/`checkMany` stay (different sentences, not just a noun).
- 5.5: `gameName(id)` / `gameTagline(id)` instead of casted template keys; `GameId` in stats,
  settings, sharing and card game definitions.
- 5.6: flags on (one unused parameter fixed); no `must()` helper – the 380 `!` sit in hot
  loops where `noUncheckedIndexedAccess` makes them the cheapest correct option.

## Phase 6 – Shared play session (M) ✅

| # | Item | Notes |
| -- | -- | -- |
| 6.1 | `core/usePuzzleSession.ts` (generalised from `sudoku/useSudokuGame.ts`): persist + visibilitychange/pagehide/autosave, start token, resume, win → `recordFinish` → clear save → delayed result, play again / menu / home, `?new=` watcher, Ctrl+Z. | Lifecycle copied ~150 lines × 9 (Arrows, Code Breaker, Crowns, Links, Mines, Nonogram, Pipes, Water Sort, cards). Migrate one game at a time behind the existing tests. |
| 6.2 | `<PlayShell>` (app bar timer, rules dialog, result dialog) and `styles/play.css` for `.play`, `.timer` (9 files), `.hud*` (5), `.toolbar` (6), `.menu` (4), `.board-wrap` (10). | |
| 6.3 | Split the god components: `useShapesJuice`, `useShapesTimeMode`, `useIdleHint` (ShapesPlay 867 lines), `useBlocksDrag`, `useBlocksKeyboard` (BlocksPlay 766), `useMinesHints` (MinesPlay 785), CardGameView (840). | After 6.1. |
| 6.4 | One start convention (`?new=<variant>` vs. path param + keyed wrapper in Merge/Shapes) and a `standardRoutes(id, lobby, play)` helper for the 16 identical `routes.ts`. | |
| 6.5 | Game art per game: `art: () => import('./Art.vue')` on the descriptor instead of 15 `game === …` branches in `GameArt.vue` and per-game CSS in `GameBackdrop.vue`. | Adding a game then no longer touches shared components. |

**Done notes.**
- 6.1/6.2: `core/usePuzzleSession.ts`, `components/PlayBar.vue` and `styles/play.css` (scoped
  to `.puzzle-play`, so Sudoku, Shapes, Blocks, Merge and the card view are untouched) are used
  by all 8 puzzle play views: 4,621 → 3,289 lines (plus 374 in the three shared files). Game-specific endings stay in the views
  (Mines/Arrows/Code Breaker losses, Mines' saved mine hit via `savedWhile` + `onShow`).
  Starting a new game now always clears the old save first (Links and Nonogram did not).
- 6.3: `useShapesJuice` (points flying, praise, board shake; ShapesPlay 870 → 749) and
  `useBlocksPlacement` (drag, tap and keyboard preview; BlocksPlay 771 → 650). **Open:**
  `CardGameView` (840 lines) and the Mines hint code – the card view needs its own session
  (moves replayed from a seed), a separate step.
- 6.4: `standardRoutes()` for 14 games. Merge and Shapes keep the variant in the path on
  purpose (the play view is remounted per variant).
- 6.5: logos live in `src/games/<id>/Logo.vue`, found via `import.meta.glob` (not through
  the descriptor: game modules sit in an import cycle with the i18n catalogue); rendering
  verified identical for all 16 games. **Open:** the background motifs stay in
  `GameBackdrop.vue` (pure CSS, ~100 lines).
- Found on the way: the Shapes result dialog had lost its *Share result* button (the binding
  had ended up above `<script setup>`, where the SFC parser ignores it).

## Phase 7 – Components, CSS & accessibility (M) ✅

| # | Item | Notes |
| -- | -- | -- |
| 7.1 | Keyboard play for Links and Shapes (cursor + `:focus-visible` pattern of the 7 other boards), or drop the misleading `grid` / `application` roles. | `LinksBoard.vue:126`, `ShapesBoard.vue:148` |
| 7.2 | Roving tabindex + arrow keys for radio groups and tabs (`SegmentedControl`, Nonogram/Mines tool groups, settings tabs). | WAI-ARIA APG |
| 7.3 | Move focus to the page heading and announce the title after route changes. | `router.ts` |
| 7.4 | Extract `SwitchControl` (CSS copied verbatim between `ToggleRow` and `GameOrderList`), unify `HintPanel` with the Crowns hint, use `SegmentedControl` for the Mines/Nonogram tool groups. | |
| 7.5 | Global reduced-motion safety net (`animation/transition-duration: 1ms`) – 84 hard-coded durations rely on per-selector rules today. Move durations to `--dur-*`. | |
| 7.6 | `--z-*` tokens (today 6, 7, 10, 20, 50, 90, 100, 101, 150); render the snackbar above the dialog scrim. | |
| 7.7 | Shared SVG defs per art family (like `pieceDefs.ts`): `GameArt` emits 15 gradients per logo (~225 on Home), `StarGlyph` and `ObstacleArt` per instance. | |
| 7.8 | UI colours and shadows from tokens (`ResultDialog`, `LobbyHero`, `ChoiceList`; no custom shadows per design guide). | |
| 7.9 | `AppButton`: required `label` for icon-only buttons; `ChoiceList` gets `highlight` as a prop instead of reading the route. | |

**Done notes.**
- 7.1: Links and Shapes have keyboard play (cursor, Enter/Space; Links draws with the arrows
  while a line is open, Shapes reads the piece under the cursor in a live region). The cursor
  shows only on `:focus-visible`. Roles stay (`grid` / `application`), now backed by input.
- 7.2: `core/rovingFocus.ts` (one tab stop, arrows/Home/End, selection follows focus) in
  `SegmentedControl` and the settings game tabs.
- 7.3: `core/routeFocus.ts`: after a navigation the page `h1` gets focus and the document
  title (`<heading> – Riddles`); not on the first load, not for query-only changes.
- 7.4: `SwitchControl` (used by `ToggleRow` and `GameOrderList`); `components/HintPanel.vue`
  (title + slot) for Sudoku and Stars, in the Stars look (accent edge); the Mines and Nonogram
  tools are a `SegmentedControl` with an `icon` slot.
- 7.5: safety net in `base.css` (1 ms, so `animationend`/`transitionend` still fire). UI
  transitions use `--dur-*`; game choreography (keyframes, idle loops) keeps literal timings
  on purpose – the design guide says so now.
- 7.6: `--z-*` tokens; board layers (`--z-board-*`) count inside the board's stacking
  context. Snackbar (`--z-toast`) above the dialog scrim, celebration in between.
- 7.7: `core/svgDefs.ts` (shared hidden `<svg>`, also used by `pieceDefs.ts`) for the logos,
  `StarGlyph` and `ObstacleArt`. Home: 12 gradients instead of ~200. The Water Sort clip
  paths stay per logo (unique ids). `shareImage.ts` copies referenced shared defs into the
  svg it turns into an image.
- 7.8: `--gold*` and `--on-hero` tokens; lobby badge from `--color-surface`; the medal icons
  in the result dialog use `--elevation-2` instead of their own drop shadows. Canvas and SVG
  presentation attributes keep hex values (CSS variables do not resolve there).
- 7.9: `AppButton` `label` (aria-label + tooltip); a test fails for an icon-only
  `<AppButton />` without it. `ChoiceList` takes `highlight` only; lobbies pass
  `useChallengeVariant()`.

## Phase 8 – Tests & small helpers (M) ✅

| # | Item | Notes |
| -- | -- | -- |
| 8.1 | Unit tests for `core/worker.ts` (RPC, crash, fallback), `core/timer.ts`, `core/format.ts`, `core/shareImage.ts`, `core/dragScroll.ts`, `core/theme.ts`. | |
| 8.2 | Component tests for FreeCell and Spider. | |
| 8.3 | Playwright gameplay flows: play moves, reload, "Continue", finish a seeded puzzle. | e2e covers render/a11y/offline only. |
| 8.4 | Remove fixed sleeps and 10 s `waitFor` in component tests: inject fixed puzzles / mock pools, fake timers. | |
| 8.5 | `core/grid.ts` (`rowOf`, `colOf`, `neighbors4`), `core/guards.ts` (`isInt` ×6), `core/history.ts` (undo history of Crowns/Nonogram/Sudoku), shared `popcount` and `pick`. | |

**Done notes.**
- 8.1: new tests for `core/format.ts`, `core/dragScroll.ts`, `core/shareImage.ts` and theme/motion
  in `core/theme.ts`; `core/worker.ts` (RPC, idle stop, hang and crash fallback) and
  `core/timer.ts` already had tests from phase 4. The `shareImage` test found that the
  shared-gradient copy of phase 7 never matched (broken regex) – fixed; the colour copy also
  keeps explicit `url(#…)` paints now.
- 8.2: `FreeCellPlay.test.ts` (deal, first move saved, undo, win by hints) and
  `SpiderPlay.test.ts` (deal, stock, undo, hint).
- 8.3: `e2e/gameplay.spec.ts`: Links (move saved, reload, *Continue*, finished by hints, no
  *Continue* afterwards), Stars keyboard play survives a reload, focus and title after a
  page change. Desktop and mobile.
- 8.4: Stars, Links and Nonogram play tests use a fixed puzzle instead of live generation (no
  10 s waits); the Blocks test waits for the state instead of sleeping.
- 8.5: `core/grid.ts` (`rowOf`, `colOf`, `neighbors4/8`; Stars), `core/guards.ts` (`isInt` ×7,
  `isNonNegativeInt`), `core/history.ts` (Stars and Nonogram undo, validation; Sudoku keeps
  its step format but now also the 500-step limit – its history grew without bound),
  `core/bits.ts` (`popcount` for Stars and Sudoku), `pickRandom` in `core/rng.ts`.
  Links, Arrows and Mines keep their own neighbour functions: their order feeds seeded
  generators, and changing it would change every generated puzzle. Shapes keeps its
  fixed-size `rowOf`/`colOf`.
