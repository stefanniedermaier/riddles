# Architecture

Riddles is a single-page application built with Vue 3, TypeScript and Vite, packaged as a
PWA with vite-plugin-pwa. There is no backend: the app is a set of static files on GitHub
Pages, and all state lives in the browser's `localStorage`.

```
┌──────────────────────────────── Browser ────────────────────────────────┐
│                                                                         │
│  App shell (src/App.vue, router.ts, views/)                             │
│    ├─ Home · Settings · Statistics                                      │
│    └─ Game routes ── src/games/<id>/routes.ts (lazy-loaded chunks)      │
│                                                                         │
│  Games (src/games/<id>/)                                                │
│    ├─ *.vue            rendering + input                                │
│    ├─ logic/           pure TypeScript: rules, generators, solvers      │
│    └─ *.worker.ts      generator running in a Web Worker                │
│                                                                         │
│  Core (src/core/)  rng · storage · settings · i18n · theme · stats      │
│                    timer · worker RPC · puzzle pool · toast · format    │
│                                                                         │
│  localStorage  "riddles:*"          Service worker (Workbox precache)   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Directory layout

| Path                    | Content                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `src/main.ts`           | Bootstraps theme, i18n, router and the app                      |
| `src/App.vue`           | `<RouterView>`, PWA update banner, toast host                   |
| `src/router.ts`         | Core routes + routes contributed by the games (hash history)    |
| `src/core/`             | Framework-light building blocks shared by all games             |
| `src/components/`       | Shared UI components (app bar, buttons, dialogs, icons …)       |
| `src/views/`            | Home, settings, statistics, not-found                           |
| `src/i18n/`             | Shell texts (`en.ts`, `de.ts`) and the merged message catalogue |
| `src/games/`            | One folder per game + `registry.ts` + `types.ts`                |
| `src/styles/`           | Design tokens (CSS custom properties) and base styles           |
| `public/`               | Logo, favicon and generated PWA icons                           |

## Core modules

| Module            | Responsibility                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `rng.ts`          | Seeded PRNG (mulberry32). `createRng(seed)`, serialisable state, `hashSeed(...)` to derive seeds.    |
| `storage.ts`      | Prefixed JSON storage, `usePersistentRef`, export/import of all data, persistent-storage request.   |
| `settings.ts`     | Global settings (language, theme, motion) and `useGameSettings()` for per-game options.             |
| `i18n.ts`         | Typed `t(key, params)`; locale from settings or device language; keeps `<html lang>` in sync.        |
| `theme.ts`        | Resolves light/dark and reduced motion; sets `data-theme` / `data-motion` and the theme-color meta. |
| `stats.ts`        | Started/finished counters, best and total times, best scores per game and variant.                  |
| `timer.ts`        | `useStopwatch` / `useCountdown`, automatically paused while the app is hidden.                      |
| `worker.ts`       | Promise-based Web Worker RPC with main-thread fallback.                                             |
| `pool.ts`         | Keeps one pre-generated puzzle per difficulty so new games start instantly.                         |
| `toast.ts`        | Short non-blocking notifications.                                                                   |
| `format.ts`       | Durations, numbers and dates, locale-aware.                                                         |

## How a game plugs in

A game lives entirely in `src/games/<id>/` and connects to the shell through three files:

| File         | Exports                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------- |
| `index.ts`   | `descriptor: GameDescriptor` – variants, stat kind, `hasSavedGame()`, optional settings panel  |
| `routes.ts`  | `routes: RouteRecordRaw[]` – usually a lobby (`/<id>`) and a play view (`/<id>/play`)          |
| `i18n.ts`    | `en` and `de` message objects; merged under the namespace `<id>`                               |

`src/games/registry.ts` lists all descriptors and routes. The home screen, statistics view
and settings view are generated from the registry – they contain no game-specific code.

`src/games/layout.ts` holds the player's choice of **which games are shown and in which
order** (Settings → Games, drag & drop). `visibleGames` drives the home screen, statistics
and settings sections; games added in an update are appended (enabled) automatically.
Hidden games keep their saves and statistics.

## Puzzle generation flow

```
Lobby ──"Hard"──▶ Play view ──pool.take('hard')──▶ cached puzzle? ── yes ──▶ start
                                    │                    │
                                    │                    no
                                    ▼                    ▼
                          refill in background   worker: generate(difficulty, seed)
                          (Web Worker)                   │
                                                         ▼
                                                       start
```

- Generators are pure functions of `(difficulty, seed)`, so every puzzle can be reproduced
  from its seed (handy for bug reports and tests).
- Generation runs in a module Web Worker (`new Worker(new URL(...), { type: 'module' })`); if
  workers are unavailable it falls back to the main thread.
- `pool.ts` stores one ready puzzle per difficulty in `localStorage`, so after the first
  game a new puzzle is usually available instantly – also offline.

## State & persistence

All keys are prefixed with `riddles:`. Versioned keys (`…:v1`) are ignored after an
incompatible format change instead of crashing the app.

| Key                          | Content                                     |
| ---------------------------- | ------------------------------------------- |
| `settings`                   | Language, theme, motion                     |
| `stats:v1`                   | Statistics of all games                     |
| `gameLayout:v1`              | Order of the games and hidden games         |
| `<game>:settings`            | Game-specific options                       |
| `sudoku:current:v1`          | Running Sudoku game                         |
| `sudoku:pool:v1`             | Pre-generated Sudoku puzzles                |
| `crowns:current:v1`          | Running Crowns game                         |
| `crowns:pool:v1`             | Pre-generated Crowns puzzles                |
| `links:current:v1`           | Running Links game                          |
| `links:pool:v1`              | Pre-generated Links puzzles                 |
| `nonogram:current:v1`        | Running Nonogram game (pool: `nonogram:pool:v1`) |
| `shapes:current:<mode>:v1`   | Running Shapes game per mode (levels: `v2`) |
| `shapes:progress:v2`         | Current (highest unlocked) level            |
| `sudoku:mini:current:v1`     | Running Mini-Sudoku game (pool: `sudoku:mini:pool:v1`) |

Settings → *Your data* exports all keys into one JSON file and imports it again
(see [privacy](privacy.md)).

## PWA

- `vite-plugin-pwa` generates the web manifest and a Workbox service worker that precaches
  every build asset (HTML, JS, CSS, icons, worker chunks). After the first visit the app
  runs completely offline.
- Updates use the *prompt* strategy: when a new service worker is waiting, the app shows
  an update banner; tapping *Update* activates it and reloads. Running games are saved
  continuously, so nothing is lost.
- iOS specifics: Apple touch icon, `apple-mobile-web-app-*` meta tags, `viewport-fit=cover`
  with safe-area insets, and a `navigator.storage.persist()` request to reduce the risk of
  storage eviction.

## i18n

- English (`en`) is the source of truth; German (`de`) objects are typed with
  `Messages<typeof en>`, so a missing or extra key is a type error.
- Keys are dotted paths and typed (`MessageKey`), e.g. `t('difficulty.hard')`.
- Templates import `t` directly; because `t` reads the reactive locale, switching the
  language re-renders immediately.

## Theming

Colours, spacing, radii and durations are CSS custom properties in `src/styles/tokens.css`,
overridden for `[data-theme='dark']`. Reduced motion sets all duration tokens to `0ms`;
JavaScript-driven animations read `motionEnabled` from `core/theme.ts`.
