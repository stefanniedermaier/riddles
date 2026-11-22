# Development

## Prerequisites

- **Node.js 26** (current LTS). The version is pinned in [`.nvmrc`](../.nvmrc); with nvm or
  fnm run `nvm use` / `fnm use`.
- npm (ships with Node).

```bash
npm ci
npm run dev
```

The dev server listens on all interfaces (`--host`), so you can open
`http://<your-computer-ip>:5173/riddles/` on a phone in the same network.

> The service worker is only active in production builds. Browsers register service
> workers only on `https://` or `localhost`, so to test offline mode use `npm run build &&
> npm run preview` on `localhost`, or the deployed GitHub Pages version on a phone.

## Scripts

| Script               | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Vite dev server with hot module replacement               |
| `npm test`           | Run all unit tests once                                   |
| `npm run test:watch` | Vitest in watch mode                                      |
| `npm run lint`       | ESLint (`npm run lint:fix` to auto-fix)                   |
| `npm run type-check` | `vue-tsc --build` for app, tests and config files         |
| `npm run build`      | Type-check + production build to `dist/`                  |
| `npm run preview`    | Serve `dist/` (with service worker)                       |
| `npm run icons`      | Regenerate icons from `public/logo.svg`                   |
| `npm run check:deps` | Lockfile sources, integrity hashes, runtime licenses      |
| `npm run audit:ci`   | Registry signatures + vulnerability audit (as in CI)      |

## Dependencies

- `.npmrc` sets `min-release-age=7`: `npm install` / `npm update` only pick versions that
  have been published for at least a week, and `engine-strict=true` enforces Node 26.
- Always commit `package-lock.json`; CI installs with `npm ci --ignore-scripts`.
- Before committing dependency changes run `npm run check:deps && npm run audit:ci`.
- Runtime dependencies (`dependencies`) must use a permissive license (see the allow list in
  `scripts/check-dependencies.mjs`). Prefer adding tools to `devDependencies`.
- `overrides` in `package.json` pin patched transitive versions where upstream has not
  caught up yet (currently `glob` 14 / `editorconfig` 4 for `workbox-build` and `js-beautify`,
  fixing GHSA-g3hv-75wg-m249 and GHSA-3g3m-2fjr-6pw4 in `minimatch`/`glob`). Remove an
  override once the parent package depends on a patched version itself.
- Dependabot proposes updates weekly; see [deployment](deployment.md#supply-chain-safeguards)
  for all safeguards.

## Testing

- Tests live next to the code in `__tests__/` folders and use Vitest (jsdom environment).
- Game logic in `src/games/<id>/logic/` is pure TypeScript and has the most tests:
  validity, uniqueness, difficulty grading, determinism per seed.
- Run a subset: `npx vitest run src/games/sudoku`.
- Generators take a seed – when a puzzle misbehaves, note its `seed` (stored in the save
  game) and reproduce it in a test.

## Conventions

- TypeScript everywhere, `<script setup lang="ts">` in components.
- Game rules and algorithms never import Vue; components never contain game rules.
- Shared UI goes to `src/components/`, shared logic to `src/core/`. Game folders don't
  import from each other.
- Styling with scoped CSS and the tokens from `src/styles/tokens.css` – no hard-coded
  colours except in game palettes, which must provide light and dark variants.
- Touch targets ≥ 44 px; test at 360 px width and in both themes.
- Storage keys: `<game>:<what>:v<n>`; bump the version when the format changes.
- Formatting follows `.editorconfig` (2 spaces, LF, max. 100 columns).

## Translations

1. Add the English text to `src/i18n/en.ts` (shell) or `src/games/<id>/i18n.ts` (game).
2. Add the German text at the same path in `de` – type-checking fails until you do.
3. Use it with `t('path.to.key')`; placeholders use `{name}` and `t(key, { name })`.

To add a language, add a new message object typed with `Messages<…>` in each i18n file,
add it to `GameModule.messages` (`src/games/module.ts`), `src/i18n/index.ts` and `core/i18n.ts` (`Locale`, `detectLocale`), and add
an option in the settings view.

## Adding a game

1. Create `src/games/<id>/` with `index.ts` (descriptor), `routes.ts`, `i18n.ts` and
   `module.ts` (`export default defineGame({ id: '<id>', descriptor, routes, messages })`).
2. Add the module to `gameModules` in `src/games/modules.ts` – this registers the id
   (`GameId`), the routes, the statistics/settings entries and the texts.
3. Add an accent colour `--game-<id>` in `tokens.css` and artwork in
   `components/GameArt.vue`.
4. Put rules and generators into `logic/` with tests; heavy generation into a worker
   (`core/worker.ts`) behind a puzzle pool (`core/pool.ts`).
5. Persist the running game under `<id>:current:v1`, record statistics via `core/stats.ts`.
6. Document it in `docs/games/<id>.md`.

## Icons

`public/logo.svg` is the master. `npm run icons` regenerates favicon, PWA icons, the
maskable icon and the Apple touch icon (`pwa-assets.config.ts`). Commit the generated
files. UI icons are inline SVG paths in `src/components/icons.ts`.
