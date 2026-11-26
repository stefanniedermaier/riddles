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
| `src/router.ts`         | Core routes + routes contributed by the games (history mode, see *Addresses*) |
| `src/core/`             | Framework-light building blocks shared by all games             |
| `src/components/`       | Shared UI components (app bar, buttons, dialogs, icons …)       |
| `src/views/`            | Home, settings, statistics, not-found                           |
| `src/i18n/`             | Shell texts (`en.ts`, `de.ts`) and the merged message catalogue |
| `src/games/`            | One folder per game + `modules.ts` (the list) + `registry.ts`   |
| `src/styles/`           | Design tokens (CSS custom properties) and base styles           |
| `public/`               | Logo, favicon, generated PWA icons and link preview images (`og/`) |
| `scripts/`              | Build checks, the search engine pages (`seo.ts`, `prerender.ts`) and asset generators |

## Core modules

| Module            | Responsibility                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `rng.ts`          | Seeded PRNG (mulberry32). `createRng(seed)`, serialisable state, `hashSeed(...)` to derive seeds.    |
| `storage.ts`      | Prefixed JSON storage, `usePersistentRef`, export/import of all data, persistent-storage request.   |
| `settings.ts`     | Global settings (language, theme, motion) and `useGameSettings()` for per-game options.             |
| `i18n.ts`         | Typed `t(key, params)`; locale from settings, page or device language; loads only that language's texts; keeps `<html lang>` in sync. |
| `theme.ts`        | Resolves light/dark and reduced motion; sets `data-theme` / `data-motion` and the theme-color meta. |
| `stats.ts`        | Started/finished counters, best and total times, best scores per game and variant.                  |
| `timer.ts`        | `useStopwatch` / `useCountdown`, automatically paused while the app is hidden.                      |
| `worker.ts`       | Promise-based Web Worker RPC with main-thread fallback.                                             |
| `pool.ts`         | Keeps one pre-generated puzzle per difficulty so new games start instantly.                         |
| `toast.ts`        | Short non-blocking notifications.                                                                   |
| `format.ts`       | Durations, numbers and dates, locale-aware.                                                         |

## How a game plugs in

A game lives entirely in `src/games/<id>/`. Its `module.ts` is the **game API**: a
`GameModule` (`src/games/module.ts`) created with `defineGame({ id, descriptor, routes })`,
built from two files; the texts sit next to them:

| File         | Exports                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------- |
| `index.ts`   | `descriptor: GameDescriptor` – variants, stat kind, `hasSavedGame()`, optional settings panel  |
| `routes.ts`  | `routes: RouteRecordRaw[]` – usually a lobby (`/<id>`) and a play view (`/<id>/play`)          |
| `i18n.ts`    | `en` message object (namespace `<id>`); German in `i18n.de.ts` (`de`, same keys)             |

Texts are bundled **per language**, not per game: `src/i18n/locales/messages.<lang>.ts`
collects the shell texts and every game's texts of one language into a chunk of its own.
The app loads only the active language before it mounts (`loadLocale` in `core/i18n.ts`; the
pages preload the file), and the other one when the language changes – until it is there,
the previous language stays on screen. The service worker precaches both.

The start page's code is one chunk (`codeSplitting` group `$initial` in `vite.config.ts`);
without it the bundler splits off every module that lazy chunks share into a tiny file.

Play views never read the route themselves: their route record passes the path params and
`?new=<variant>` as props (`playProps` in `src/games/routes.ts`; `newGame`, plus e.g. `variant`
or `mode`). Tests can mount a play view with `props: playProps(route)`.

`src/games/modules.ts` is the **only list of games**. Everything else is derived from it:

```
games/<id>/module.ts ──▶ games/modules.ts ──┬─▶ GameId type
                                            ├─▶ registry.ts (descriptors, routes) ──▶ router, views
                                            └─▶ i18n/index.ts (texts, typed keys)  ──▶ t()
```

The home screen, statistics and settings views are generated from the registry – they
contain no game-specific code. Message keys stay fully typed (`t('sudoku.name')`), and
`defineGame` rejects German texts whose keys differ from the English ones. The text
catalogue is built on first use, because game descriptors import `t` (building it while
the modules load would be an import cycle). `src/games/__tests__/modules.test.ts` checks
that ids are unique, match the descriptors and that routes stay under `/<id>`.

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
| `crowns:current:v1`          | Running Stars game (formerly Crowns)        |
| `crowns:pool:v1`             | Pre-generated Stars puzzles                 |
| `links:current:v1`           | Running Links game                          |
| `links:pool:v1`              | Pre-generated Links puzzles                 |
| `nonogram:current:v1`        | Running Nonogram game (pool: `nonogram:pool:v1`) |
| `arrows:current:v1`          | Running Arrows game (pool: `arrows:pool:v1`, settings: `arrows:settings`) |
| `merge:current:<variant>:v1` | Running Merge game per variant; `merge:records:v1` = highest tiles |
| `blocks:current:v1`          | Running Blocks game                         |
| `mines:current:v1`           | Running Mines game (pool: `mines:pool:v1`, settings: `mines:settings`) |
| `pipes:current:v1`           | Running Pipes game                          |
| `watersort:current:v1`       | Running Water Sort game (settings: `watersort:settings`) |
| `codebreaker:current:v1`     | Running Code Breaker game (settings: `codebreaker:settings`) |
| `<card game>:current:v1`     | Running Solitaire / Spider / FreeCell / TriPeaks game: seed, variant, moves (pool: `<game>:pool:v1`, settings: `<game>:settings`) |
| `shapes:current:<mode>:v1`   | Running Shapes game per mode (levels: `v2`) |
| `shapes:progress:v2`         | Current (highest unlocked) level            |
| `sudoku:mini:current:v1`     | Running Mini-Sudoku game (pool: `sudoku:mini:pool:v1`) |

Settings → *Your data* exports all keys into one JSON file and imports it again
(see [privacy](privacy.md)).

## Addresses and search engines

- **Real paths** (`createWebHistory`): `/riddles/` (home), `/riddles/<slug>/` (game lobby),
  `/riddles/<slug>/play`, `/riddles/settings` … The slug is the game id unless the game was
  renamed (`src/games/slugs.ts`: Stars lives at `/stars`, id `crowns`; `/crowns` redirects).
- **German pages** run the same app under `/riddles/de/…` (`core/site.ts`: router base per
  page). While the language setting is *system*, the page language decides the app language
  (`i18n.ts`), so search engines get German content there; otherwise the setting wins.
- **Old hash links** (`#/sudoku?challenge=…`, used up to v0.13) are rewritten to paths in
  `main.ts` before the router starts (`rewriteLegacyHash`).
- **Prerendered pages:** `scripts/seo.ts` builds, from the app's own catalogues, the head
  (title, description, canonical, `hreflang`, Open Graph, Twitter card, JSON-LD) and a short
  static body (heading, game description, rules, links to all games) for every public page
  in both languages. The Vite build fills the English home page – the app shell – and
  `scripts/prerender.ts` writes all other pages, `404.html` (shell for unknown paths) and
  `sitemap.xml` after the build. The static body is hidden while JavaScript starts the app
  (`.js .prerender`) and replaced when it mounts. App pages (settings, statistics, privacy,
  imprint) are `noindex`.
- **In the app** `core/pageMeta.ts` keeps title, description, canonical and `hreflang` in
  step when navigating (home and game pages only).
- **Link preview images** (`public/og/<lang>/<game>.jpg`, 1200 × 630) are rendered from the
  real game logos by `npm run og-images` and committed.

## PWA

- `vite-plugin-pwa` generates the web manifest and a Workbox service worker that precaches
  every build asset (JS, CSS, icons, worker chunks) and the app shell `index.html`, which it
  serves for every navigation – any page, in either language, opens offline. The
  prerendered pages and preview images are for crawlers and are not precached.
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
- The active language: the setting; with *system* the page language (`/riddles/de/…`),
  otherwise the device language.

## Theming

Colours, spacing, radii and durations are CSS custom properties in `src/styles/tokens.css`,
overridden for `[data-theme='dark']`. Reduced motion sets all duration tokens to `0ms`;
JavaScript-driven animations read `motionEnabled` from `core/theme.ts`.
