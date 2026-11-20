# Plan 01 – Foundation

Goal: an installable, offline-capable app shell into which the three games plug in.

## 1. Tooling

| Tool                    | Version (Nov 2026) | Notes                                                          |
| ----------------------- | ------------------ | -------------------------------------------------------------- |
| Node.js                 | 26 LTS             | `.nvmrc` = `26`, `engines.node` = `>=26`                        |
| Vite                    | 8.x                | dev server + build, `base: '/riddles/'` for GitHub Pages        |
| Vue                     | 3.5.x              | Composition API, `<script setup lang="ts">`                     |
| Vue Router              | 5.x                | hash history (no server-side fallback needed on Pages)          |
| TypeScript              | 6.0.x              | TS 7 (native) has no JS API yet, which `vue-tsc` requires       |
| vue-tsc                 | 3.x                | type-checking of `.vue` files                                   |
| vite-plugin-pwa         | 2.x                | manifest + Workbox service worker (`generateSW`)                |
| @vite-pwa/assets-generator | 2.x             | generates PNG icons from `public/logo.svg` (`npm run icons`)    |
| Vitest + jsdom          | latest             | unit tests for logic, a few component smoke tests               |
| ESLint                  | 10.x               | `eslint-plugin-vue` + `@vue/eslint-config-typescript`           |

Project layout follows the official `create-vue` template (tsconfig split into app / node /
vitest), without devtools plugin and without oxlint.

### npm scripts

| Script        | Purpose                                         |
| ------------- | ----------------------------------------------- |
| `dev`         | Vite dev server (with `--host` for phone tests) |
| `build`       | type-check + production build into `dist/`      |
| `preview`     | serve `dist/` locally                           |
| `test`        | Vitest (run once); `test:watch` for watch mode  |
| `lint`        | ESLint                                          |
| `type-check`  | `vue-tsc --build`                               |
| `icons`       | regenerate PWA icons from `public/logo.svg`     |

## 2. Directory structure

```
.github/workflows/deploy.yml   CI (lint, type-check, test, build) + Pages deploy
docs/                          user & developer documentation
plan/                          these plans
public/                        logo.svg, generated icons, favicon
src/
  main.ts                      bootstraps app, router, theme, i18n, SW registration
  App.vue                      shell: <RouterView>, update banner, toasts
  router.ts                    core routes + routes from game registry
  styles/                      tokens.css (colours, spacing), base.css
  core/                        framework-agnostic helpers (+ small Vue composables)
    rng.ts                     seeded PRNG (mulberry32) with serialisable state
    storage.ts                 namespaced localStorage, persistent refs, export/import
    settings.ts                global settings (locale, theme, motion)
    i18n.ts                    tiny typed i18n (`t('home.title')`)
    theme.ts                   resolves theme + motion, sets <html> attributes
    stats.ts                   per game / variant statistics
    timer.ts                   stopwatch composable, pauses when app is hidden
    worker.ts                  promise-based Web Worker RPC with inline fallback
    format.ts                  duration / number formatting
  components/                  shared UI (AppBar, AppButton, AppDialog, Segmented,
                               DifficultyPicker, ResultDialog, Icon, LoadingOverlay …)
  views/                       HomeView, SettingsView, StatsView, NotFound
  i18n/                        en.ts, de.ts (shell texts) + index.ts (merges game texts)
  games/
    registry.ts                game descriptors (id, name key, icon, variants, …)
    types.ts                   GameDescriptor type
    sudoku/ crowns/ shapes/    one folder per game (see plans 02–04)
```

Each game folder contains at least:

```
games/<id>/
  index.ts        exports descriptor parts used by the registry (hasSavedGame, …)
  routes.ts       RouteRecordRaw[] under /<id>
  i18n.ts         { en, de } message objects (namespace = game id)
  logic/          pure TypeScript + __tests__/
  *.vue           views and components
```

## 3. Core modules

### 3.1 Seeded RNG (`core/rng.ts`)

- `createRng(seed: number): Rng` – mulberry32; methods `next()`, `int(max)`,
  `range(min, max)`, `pick(arr)`, `shuffle(arr)` (in place, Fisher–Yates), `getState()`.
- `createRng(rng.getState())` continues the exact sequence (needed to resume Shapes).
- `randomSeed()` uses `crypto.getRandomValues`.
- `hashSeed(...parts)` derives seeds from strings/numbers (e.g. Shapes level numbers).

### 3.2 Storage (`core/storage.ts`)

- All keys are prefixed with `riddles:`; values are JSON.
- `load(key, fallback, validate?)`, `save(key, value)`, `remove(key)`, `has(key)`.
- `usePersistentRef(key, fallback, { validate, debounceMs })` – a Vue ref that loads once
  and saves on (deep) change.
- Schema versions are part of the key (`sudoku:current:v1`), so incompatible old data is
  simply ignored after a format change.
- `exportData()` → `{ app: 'riddles', format: 1, exportedAt, data: { [key]: value } }`.
- `importData(json)` validates shape/app id, clears existing `riddles:*` keys, writes data.
- `requestPersistentStorage()` calls `navigator.storage.persist()` (reduces eviction risk,
  notably on iOS).
- All access wrapped in try/catch (private mode, quota) – the app must still run.

### 3.3 Settings (`core/settings.ts`)

Global persisted settings: `locale: 'system' | 'en' | 'de'`, `theme: 'system' | 'light' |
'dark'`, `motion: 'system' | 'full' | 'reduced'`. Game-specific settings live in the game
folder (own persistent ref) and are rendered in the settings view through an optional
`settingsComponent` in the game descriptor.

### 3.4 i18n (`core/i18n.ts`, `src/i18n/`)

- No library – a ~60-line typed implementation is enough.
- `en` objects are the source of truth; `de` objects must have the same shape
  (`Messages<typeof en>` mapped type), so missing translations fail type-checking.
- Keys are dotted paths (`'sudoku.difficulty.easy'`), typed via a recursive key type.
- `{name}` placeholders: `t('stats.bestTime', { time: '3:12' })`.
- Active locale: setting, or `navigator.language` (`de*` → German, otherwise English).
  Sets `<html lang>`.

### 3.5 Theme & motion (`core/theme.ts`)

- Resolves `theme` setting with `prefers-color-scheme`; sets `data-theme` on `<html>` and
  updates `<meta name="theme-color">`.
- Resolves `motion` setting with `prefers-reduced-motion`; sets `data-motion` and exposes
  `motionEnabled` (computed) for JS-driven animations (Shapes).
- Colours are CSS custom properties in `styles/tokens.css` for both themes.

### 3.6 Statistics (`core/stats.ts`)

```ts
interface VariantStats {
  started: number
  finished: number          // solved puzzles / completed runs
  bestTimeMs?: number       // puzzles
  totalTimeMs: number       // puzzles – for the average
  bestScore?: number        // Shapes
  lastPlayedAt?: string     // ISO date
}
recordStart(gameId, variant)
recordFinish(gameId, variant, { timeMs?, score? }) → { newBestTime, newBestScore }
getStats(gameId): Record<variant, VariantStats>
resetStats(gameId?)
```

The stats view renders these generically using `variants` and `statKind`
(`'time' | 'score'`) from the game descriptors.

### 3.7 Timer (`core/timer.ts`)

`useStopwatch(initialMs)` → `{ elapsedMs, running, start, pause, reset }`; uses
`performance.now()` deltas, pauses automatically on `visibilitychange` (hidden) and resumes
when visible if it was running. `useCountdown` (Shapes time mode) is built on the same
mechanism.

### 3.8 Worker RPC (`core/worker.ts`)

```ts
// in the worker file
exposeWorker<Req, Res>(handler)
// in the app
const generate = createWorkerClient<Req, Res>(
  () => new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' }),
  () => import('./logic/generator').then(m => m.handleRequest), // fallback without workers
)
await generate({ difficulty: 'hard', seed })
```

Request ids map responses to promises; errors are re-thrown on the main thread.

### 3.9 Puzzle prefetch

Generic helper `createPuzzlePool(gameId, generate)`: keeps one ready-made puzzle per
difficulty in storage (`<game>:pool:v1`). `take(difficulty)` returns the cached puzzle
(or generates one) and immediately starts generating a replacement in the worker.

## 4. App shell & navigation

| Route                | View                                                           |
| -------------------- | -------------------------------------------------------------- |
| `#/`                 | Home – game cards with "Continue" badge if a game is saved      |
| `#/settings`         | Settings – language, theme, motion, game settings, data, about  |
| `#/stats`            | Statistics – one section per game                              |
| `#/<game>/…`         | Game routes (lobby → play), defined in the game folder          |

- Hash history: works on GitHub Pages without a 404 fallback and with the PWA `start_url`.
- Android hardware "back" walks the history (play → lobby → home).
- Game routes are lazy-loaded (`() => import(...)`), so each game is its own chunk.
- `AppBar`: back button, title, action slot. Content max-width ≈ 560 px, centred.
- Layout uses `100dvh`, `env(safe-area-inset-*)`, `overscroll-behavior: none`,
  `touch-action: manipulation` (no double-tap zoom), `user-select: none` on boards.

### Game descriptor (`games/types.ts`)

```ts
interface GameDescriptor {
  id: 'sudoku' | 'crowns' | 'shapes'
  icon: IconName                       // inline SVG in components/Icon.vue
  accent: string                       // CSS colour token for the home card
  variants: readonly string[]          // difficulties or modes
  statKind: 'time' | 'score'
  hasSavedGame(): boolean
  settingsComponent?: () => Promise<Component>
}
```

Name and description come from i18n keys `<id>.name` / `<id>.tagline`.

## 5. PWA

- `vite-plugin-pwa` with `registerType: 'prompt'` and `virtual:pwa-register/vue`:
  - `needRefresh` → banner "Update available – Reload" (running games are auto-saved, so a
    reload is safe).
  - `offlineReady` → one-time toast "Ready to play offline".
- Workbox precaches all build assets (`js, css, html, svg, png, webmanifest`), including
  worker chunks. No runtime caching needed (no remote data).
- Manifest: `name`/`short_name` "Riddles", `display: standalone`, `orientation: portrait`,
  `start_url: './'`, `scope: './'`, theme/background colours, icons 64/192/512 + maskable.
- iOS: `apple-touch-icon` (180 px), `apple-mobile-web-app-capable`,
  `apple-mobile-web-app-title`, `viewport-fit=cover`.
- `navigator.storage.persist()` requested once at app start (fire and forget).

## 6. Settings view – data section

- **Export**: builds the export JSON; uses the Web Share API with a file when available
  (best path on iOS), otherwise a download link `riddles-backup-YYYY-MM-DD.json`.
- **Import**: file picker → validate → confirm dialog → replace data → reload.
- **Reset**: confirm dialog → remove all `riddles:*` keys.

## 7. CI / deployment

Single workflow `.github/workflows/deploy.yml`:

- Triggers: push to `main`, pull requests, manual dispatch.
- Job `build`: checkout → setup-node (`node-version-file: .nvmrc`, npm cache) → `npm ci` →
  lint → type-check → test → build → upload Pages artifact (only on `main`).
- Job `deploy` (only on `main`): `actions/deploy-pages` into the `github-pages` environment.
- One-time repo setting: *Settings → Pages → Source: GitHub Actions*.

## 8. Tests

- `core/__tests__`: rng determinism/state restore, storage export/import round trip,
  i18n key lookup + interpolation, stats recording.
- Smoke test: Home view renders three game cards.

## 9. Acceptance criteria

- `npm run build` produces a PWA that passes Chrome's installability checks.
- App opens offline after the first visit (airplane mode test).
- Theme and language switch instantly and persist.
- Export → reset → import restores all data.
