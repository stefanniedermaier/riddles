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
| Shapes             | Modes: Zen (endless), Time, Levels with goals; geometric SVG pieces (colour + shape)         |
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
the shell through `src/games/registry.ts`, its own `routes.ts` and its own `i18n.ts`.

## Definition of done (per milestone)

- `npm run lint`, `npm run type-check`, `npm test` and `npm run build` pass.
- Game logic has unit tests covering generation validity, uniqueness and difficulty grading.
- UI works at 360 px width, in light and dark theme, in German and English.
- Running game state survives a reload.
