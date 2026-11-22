# 11 – Games as separate packages / plugins (evaluation)

**Status:** option A is implemented (one module list, see `docs/architecture.md` →
*How a game plugs in*). Options B and C are **deferred – backlog idea**: revisit when there
is a concrete external game.

**Question:** Should every game move to its own repository and be installable on its own,
with Riddles as a base app that installs the standard games by choice and further games
from a GitHub repository URL?

## Today

- One repository, one Vite build, one static deployment (GitHub Pages), one service worker
  that precaches everything (~0.5 MB for the whole app, all seven games included).
- A game plugs in through three files (`index.ts` descriptor, `routes.ts`, `i18n.ts`) and
  `src/games/registry.ts` (before option A: plus the `GameId` union and `src/i18n/index.ts`).
  Game chunks are already lazy-loaded per route.
- Games depend on shared code: `core/` (rng, storage, timer, stats, i18n, worker RPC, pool,
  toast), `components/` (AppBar, dialogs, buttons, GameSettingsButton …), design tokens.
- Players can already hide games (Settings → Games); hidden games cost nothing at runtime.

## Options

### A – Stay a monorepo, sharpen the game API (low effort)

Formalise what a game is (`GameModule`: descriptor, routes, messages, settings panel,
storage namespace, optional worker) and build the registry, router and i18n from one list
of modules instead of hand-written imports in four places.

- \+ One PR can still change core and all games together (like the *Check* button, which
  touched three games and the core in one change).
- \+ Type safety stays end to end (typed i18n keys, settings, saves).
- \+ No new infrastructure, one CI, one Dependabot, one release.
- − No third-party games.

### B – Monorepo with workspaces (`packages/core`, `packages/game-sudoku`, …) (medium)

Same repository, but each game is an npm workspace package with its own `package.json`,
tests and version; the app composes the selected packages at build time.

- \+ Hard boundaries (a game can only use the public core API), per-game versions and
  changelogs, a game can be published to npm.
- \+ Prepares option C without paying for it yet.
- − More configuration (workspace builds, TS project references, publishing).
- − Still build-time composition: "install" a game = it is in the build.

### C – Separate repositories + runtime installation from a URL (high effort)

The base app ships the core and loads games at runtime from a URL (e.g. the game's own
GitHub Pages site or jsDelivr – `raw.githubusercontent.com` serves `text/plain` and cannot be
imported as a module). A game repository publishes a manifest (`riddles-game.json`: id,
name, version, API version, entry, icon) and a built ES module.

Pros

- \+ Anyone can write a game; standard games and own games use the same mechanism.
- \+ Independent release cycles per game.
- \+ Smaller base download (only matters a little: the whole app is ~0.5 MB today).

Cons / hard problems

1. **Security.** A module imported at runtime runs in the app's origin: it can read and
   overwrite *all* saves and settings in `localStorage`, change the UI and send data
   anywhere. "Install from URL" would mean trusting arbitrary code. Mitigations:
   - run external games in a **sandboxed iframe** (`sandbox="allow-scripts"`, separate
     origin) and give them a small `postMessage` API (scoped storage, stats, theme, locale,
     haptics) – safe, but the game no longer shares Vue components or the design system
     directly; it uses an SDK package instead;
   - or allow only a **curated list** with pinned versions and integrity hashes (SRI) –
     simpler, but then it is not "any repo URL".
2. **Shared dependencies and API stability.** In-origin modules must use the same Vue
   instance (import map / externals) and a stable core API. Every breaking change in
   `core/` becomes a versioned API change with compatibility checks (`apiVersion`).
3. **Offline / PWA.** Runtime-installed games are not in the precache: they need runtime
   caching, update checks, and handling of a game whose host is gone.
4. **Typing and i18n.** Today `t('sudoku.…')` is type-checked across the app; external games
   bring their own messages, so keys become untyped at the boundary.
5. **Maintenance for one developer.** N repositories = N CI pipelines, rulesets, Dependabot
   configs, releases and security policies; refactors across games need coordinated
   releases.

## Comparison

| Criterion                    | A monorepo | B workspaces | C runtime plugins           |
| ---------------------------- | ---------- | ------------ | --------------------------- |
| Third-party / own games      | no         | via PR/build | yes                         |
| Security risk                | none       | none         | high (or iframe sandbox)    |
| Effort                       | small      | medium       | large                       |
| Cross-game changes           | easy       | easy         | coordinated releases        |
| Offline                      | precached  | precached    | runtime cache needed        |
| Type safety                  | full       | full         | partial (SDK types)         |

## Recommendation

1. **Do A now** (part of normal work): one `GameModule` list feeds registry, router, i18n
   and settings; document it as the *game API*. Standard games stay in this repository.
   "Choosing" standard games is already covered by Settings → Games (show/hide).
2. **Do B only if** games should be versioned or published separately – it is a clean
   intermediate step but brings little for players.
3. **Do C only with the iframe sandbox**, and only once there is a concrete external game:
   - `@riddles/sdk` (tiny, framework-free) for the `postMessage` API;
   - Settings → Games → *Add game from URL* (manifest URL, warning, shows origin/version);
   - games run full-screen in an iframe route `/ext/<id>`, storage namespaced per game,
     included in backup export/import;
   - the standard games keep running natively (faster, typed, shared components).

Splitting the existing standard games into separate repositories is **not** recommended:
it adds the costs of C without its benefit (the games are written by the same person and
change together with the core).

## Open questions for the decision

- Is there a concrete external game (own or third party) planned? If not, A is enough.
- Is "any repository URL" a must, or would a curated catalogue (reviewed list) do?
- Should external games be able to use the Riddles look (SDK ships CSS tokens) or are they
  free in their design?
