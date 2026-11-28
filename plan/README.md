# Riddles – Implementation Plan

Riddles is an installable, offline-capable Progressive Web App (PWA) with simple puzzle
games for phones (iOS and Android). It is hosted on GitHub Pages, has no backend and keeps
all data on the device. Every level is generated on the fly.

## Plans

| #  | Plan                                         | Scope                                                         |
| -- | -------------------------------------------- | ------------------------------------------------------------- |
| 01 | [Foundation](01-foundation.md)               | Tooling, app shell, PWA, routing, i18n, theming, storage, CI  |
| 02 | [Sudoku](02-sudoku.md)                       | Generator, technique-based grader, hints, notes, UI           |
| 03 | [Crowns](03-crowns.md)                       | Region puzzle (one crown per row/column/region), generator, UI |
| 04 | [Shapes](04-shapes.md)                       | Match-3 engine, Zen / Time / Levels modes, animations         |
| 05 | [Documentation & release](05-docs-release.md) | README, docs, license, icons, deployment, QA checklist        |
| 06 | [Links](06-links.md)                         | Path-connection puzzle (Numberlink genre), added after v0.2.0 |
| 07 | [Nonogram](07-nonogram.md)                   | Nonogram with line-logic generator, added after v0.3.1        |
| 08 | [Game management](08-game-management.md)     | Show/hide and reorder games (settings, drag & drop)           |
| 09 | [Merge](09-merge.md)                         | Sliding number game (3×3, 4×4, 5×5)                           |
| 10 | [Arrows](10-arrows.md)                       | Ordering puzzle: tap arrows so they slide out                 |
| 11 | [Game plugins](11-game-plugins.md)           | Game API (one module list) done; repos / plugins in backlog   |
| 12 | [Blocks](12-blocks.md)                       | Block-placing puzzle: three pieces, clear rows and columns     |
| 13 | [Mines](13-minesweeper.md)                   | Minesweeper without guessing: pre-opened start, logic solver  |
| 14 | [Pipes](14-pipes.md)                         | Rotation puzzle: spanning tree, flow, locks                   |
| 18 | [Pipes: several sources](18-pipes-colors.md) | Expert with three sources, spanning forest, mixed water       |
| 15 | [Water Sort](15-water-sort.md)               | Colour sorting with a solver-checked generator and hints      |
| 16 | [Code Breaker](16-code-breaker.md)           | Code breaking with consistent-code hints                      |
| 17 | [Card games](17-card-games.md)               | Solitaire, Spider, FreeCell, TriPeaks on a shared engine; points, pass limits |
| 19 | [Shared puzzles](19-shared-puzzles.md)         | Evaluation: seed links for the same puzzle, versioning, daily puzzle |
| 20 | [QA & cleanup](20-qa-cleanup.md)             | App-wide review: shared lobby/session, a11y, performance, tooling, tests |
| 21 | [Search engines & previews](21-seo.md)       | History routing, prerendered pages per game, link previews, structured data, sitemap |
| 22 | [Snake](22-snake.md)                         | First real-time game: game loop, three modes, speeds and a calm step-by-step mode |
| 23 | [Bubbles](23-bubbles.md)                     | Bubble shooter (planned): hex grid, analytic aim/bounce, Endless / Levels / Time |

## Decisions (from the kick-off wizard)

| Topic              | Decision                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------ |
| Stack              | Vite + TypeScript + Vue 3, latest Node LTS (Node 26)                                        |
| UI language        | German + English, defaults to device language, switchable in settings                       |
| Docs language      | English (README, `docs/`, plans)                                                            |
| License            | MIT                                                                                         |
| App / game names   | **Riddles** with **Sudoku**, **Crowns** (row/column/region puzzle), **Shapes** (match-3)     |
| Sudoku             | 4 difficulties (Easy/Medium/Hard/Expert), unique solution, notes/candidates, explained hints |
| Crowns             | Difficulty determines size: Easy 6×6, Medium 7×7–8×8, Hard 9×9, Expert 10×10; logic-graded  |
| Shapes             | Modes: Zen (endless), Time, Levels with goals; fruit & garden SVG pieces (colour + shape)        |
| Persistence        | Resume running games, statistics & best values, JSON export/import – all local              |
| Presentation       | Dark mode (system + manual), animations (respect "reduce motion")                           |
| Not in scope (v1)  | Daily puzzle, sound effects, vibration, undo/redo, instant error highlighting in Sudoku      |
| Workflow           | Plans → implementation → local commits; pushing to `origin` only after confirmation         |

### Originality

The games use well-known, generic puzzle mechanics (Sudoku, the "one per row/column/region,
no touching" family also known as *Star Battle*, and match-3). Names, artwork, colours and
layouts are original; nothing is copied from commercial titles.

## Guiding principles

1. **Pure, testable game logic.** Everything in `src/games/*/logic/` is framework-free
   TypeScript with unit tests (Vitest). Vue components only render state and forward input.
2. **Deterministic generation.** All generators take a seed (`core/rng.ts`). The same seed
   produces the same puzzle, which makes bugs reproducible and tests stable.
3. **Never block the UI.** Expensive generation (Sudoku, Crowns) runs in a Web Worker, and
   the next puzzle per difficulty is prefetched and cached so "New game" is instant.
4. **Mobile first.** Touch-friendly targets (≥ 44 px), safe-area insets, no accidental zoom
   or pull-to-refresh, works offline after the first visit.
5. **Small footprint.** Few runtime dependencies (Vue, Vue Router). No UI kit, no web fonts,
   no external assets; icons are inline SVG.
6. **Local data only.** `localStorage` with namespaced, versioned keys; export/import as JSON.

## Milestones

| Milestone | Content                                   | Depends on |
| --------- | ----------------------------------------- | ---------- |
| M0        | Plans, documentation skeleton, license    | –          |
| M1        | Foundation (plan 01)                      | M0         |
| M2        | Sudoku (plan 02)                          | M1         |
| M3        | Crowns (plan 03)                          | M1         |
| M4        | Shapes (plan 04)                          | M1         |
| M5        | Docs, icons, polish, QA (plan 05)         | M2–M4      |

M2–M4 are independent of each other: each game lives in its own folder and only plugs into
the shell through its own `module.ts` (descriptor, routes, texts) listed in `src/games/modules.ts`.

## Backlog

Ideas that are evaluated but deliberately postponed:

| Idea                                   | Notes                                                                 |
| -------------------------------------- | --------------------------------------------------------------------- |
| Games as workspace packages            | Plan 11, option B – only if games should be versioned or published   |
| External games from a URL (plugins)    | Plan 11, option C – only with an iframe sandbox and a small SDK; wait for a concrete external game |

## Definition of done (per milestone)

- `npm run lint`, `npm run type-check`, `npm test` and `npm run build` pass.
- Game logic has unit tests covering generation validity, uniqueness and difficulty grading.
- UI works at 360 px width, in light and dark theme, in German and English.
- Running game state survives a reload.
