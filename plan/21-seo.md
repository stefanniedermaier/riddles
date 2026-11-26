# 21 – Search engines and link previews (SEO)

**Status:** planned.

## Goal

Riddles should be found by people searching for the games it offers ("nonogram online",
"sudoku offline app", "free solitaire without ads") and shared links should look inviting.
Concretely:

1. every game has its **own indexable URL** with its own title, description and content;
2. crawlers **without JavaScript** (most non-Google search engines, AI crawlers, link
   previews in messengers) see real content;
3. **shared links** (challenge links, the app link) show a preview with image and text;
4. search engines get the **standard signals**: canonical URLs, structured data, a
   sitemap, a verified Search Console property.

All of this without giving up what Riddles stands for: **no tracking, no third-party
requests, no backend**, a strict Content-Security-Policy and a fast, offline-first PWA.

Effort: **S** ≤ half a day, **M** 1–2 days, **L** more.

## Analysis (status quo, v0.13.2)

| # | Finding | Impact |
| -- | -- | -- |
| A1 | Hash routing (`createWebHashHistory`): `#/sudoku`, `#/shapes` … Search engines ignore everything after `#`, so **only `…/riddles/` exists** for them. | High – no game can rank on its own |
| A2 | Without JavaScript the page contains only "Riddles needs JavaScript to run." | High – invisible to non-rendering crawlers and link previews |
| A3 | `<meta name="description">`, manifest and `package.json` describe "Sudoku, Crowns and Shapes" – there are 16 games and Crowns is called Stars. One description for every page. | Medium |
| A4 | No Open Graph / Twitter Card tags, no preview image: shared challenge links appear as a bare URL. | Medium – the app actively invites sharing |
| A5 | No `canonical`, no structured data (Schema.org), no sitemap; no Search Console property. A `robots.txt` under `/riddles/` would be ignored – it must sit at the host root (`stefanniedermaier.github.io/robots.txt`, a different repository). | Medium |
| A6 | `<html lang="en">` is served; German appears only client-side, there is no German URL and no `hreflang`. | Low–medium (German search) |
| A7 | URL slug `crowns` for the game called Stars. | Low |

**Already good:** HTTPS, mobile-first, fast (94 kB gzip initial), installable and offline,
one `h1` and a page title per route (`routeFocus.ts`), accessible semantics, no tracking.

## Decisions

| Topic | Decision | Why |
| -- | -- | -- |
| Routing | **History routing** with real paths (`/riddles/sudoku/`), trailing slash as the canonical form | The only way to get one indexable URL per game on a static host |
| Rendering | **Own prerender step** after `vite build`: one static HTML file per public route, generated from the game catalogues; the SPA mounts over it | No SSR framework and no new runtime dependency. The app touches `localStorage`, workers and `window` at import time – full SSR/SSG (e.g. `vite-ssg`) would need large changes for little gain. Node 26 imports the `.ts` catalogues directly (type stripping) |
| Static content | Short, real content per page: heading, tagline, rules, links to the other games – the same text the app shows | Useful for crawlers and for users before the app starts; no hidden text (no cloaking) |
| Preview images | 1200 × 630 PNGs per game and for the app, **generated once by a script and committed** (like `npm run icons`) | Deterministic, reviewable, no build-time browser |
| Structured data | JSON-LD (`WebApplication` for the app, `VideoGame` per game) | Data blocks are not executed – compatible with the CSP |
| Language | Phase 1–5: one URL per page in **English**; German pages are a separate, optional phase (7) | Doubles the page count; decide after measuring (open question Q3) |
| Tracking | **None.** Success is measured only with Search Console / Bing Webmaster Tools (server-side, no code in the app) | Privacy promise |

## Phase 1 – Quick wins without routing changes (S)

| # | Item | Where |
| -- | -- | -- |
| 1.1 | New description (≈ 150 characters, en): all 16 games, offline, free, no ads, no account. Same text in the manifest and `package.json`. | `index.html`, `vite.config.ts`, `package.json` |
| 1.2 | Open Graph + Twitter Card tags for the app: `og:title`, `og:description`, `og:type=website`, `og:url`, `og:image` (absolute URL, 1200 × 630, see 2.1 – until then the 512 px icon), `og:locale` (+ `og:locale:alternate=de_DE`), `twitter:card=summary_large_image`. | `index.html` |
| 1.3 | `<link rel="canonical" href="https://stefanniedermaier.github.io/riddles/">`. | `index.html` |
| 1.4 | JSON-LD `WebApplication`: name, url, description, `applicationCategory: GameApplication`, `operatingSystem: Any`, `offers` price 0, `inLanguage` en/de, `isAccessibleForFree`, image. The CSP plugin may hash the block (harmless); it is not executed. | `index.html`, check `vite.config.ts` |
| 1.5 | Static start content inside `#app`, replaced when Vue mounts: `h1` "Riddles", one sentence, the list of games with their taglines. `<noscript>` keeps a short hint. Styled with the existing CSS so the switch causes no visible jump (layout shift). | `index.html`, `base.css` |
| 1.6 | Search Console / Bing verification via `<meta name="google-site-verification">` (code from the owner, Q1). | `index.html` |

**Test:** `check-dist.mjs` asserts title, description, canonical, `og:*`, JSON-LD (valid
JSON) and a non-empty static `h1` in `dist/index.html`; e2e still passes (no CSP violation,
no console error).

## Phase 2 – Preview images (S–M)

| # | Item | Notes |
| -- | -- | -- |
| 2.1 | `npm run og-images`: a script renders `public/og/app.png` and `public/og/<game>.png` (1200 × 630) in the app's light look – game colour, game logo, name, tagline, "Riddles · free · offline". Reuses the drawing code of the share image (`core/shareImage.ts`). Runs locally with Playwright, output is committed. | One-off; re-run when a game is added or its logo changes |
| 2.2 | Size budget: each PNG ≤ 100 kB (optimised). Not precached by the service worker (only crawlers need them) – exclude `og/` from `globPatterns`. | `vite.config.ts`, `check-dist.mjs` |

## Phase 3 – History routing (M–L)

| # | Item | Notes |
| -- | -- | -- |
| 3.1 | `createWebHistory(import.meta.env.BASE_URL)` instead of hash history. | `router.ts` |
| 3.2 | **Legacy hash links keep working:** on start, `#/<path>?<query>` is rewritten to `/<path>/?<query>` with `history.replaceState` before the router resolves. Covers shared challenge links, bookmarks and installed apps. Kept for at least a year (CHANGELOG note). | `main.ts` or a small `core/legacyHash.ts` with unit tests |
| 3.3 | Challenge links use paths: `…/riddles/<game>/?challenge=…`. | `core/share.ts` + tests |
| 3.4 | GitHub Pages fallback: `dist/404.html` = the app shell (unknown paths and deep play URLs still start the SPA; the not-found view handles the rest). Play URLs get their own files in 4.1, so the 404 status hits only truly unknown paths. | build script |
| 3.5 | Service worker: navigations are answered from the precached page of that path, otherwise `index.html` (`navigateFallback`), with `navigateFallbackAllowlist` limited to the app's scope. Check update flow from a hash-routed version to the new one (old SW serves old `index.html` until the update banner). | `vite.config.ts` |
| 3.6 | Manifest: `start_url: './'`, `scope: './'` stay; `handle_links` / `launch_handler` work with paths unchanged. Verify link capturing on Android and that installed apps open path links in the app. | manual test |
| 3.7 | Optional (Q4): Stars under `/stars/` (game id and storage keys stay `crowns`); `/crowns/` redirects. | `crowns/routes.ts` |
| 3.8 | Tests: e2e navigates by paths; new e2e cases for legacy hash links, deep links on reload and offline start on a deep link. | `e2e/` |

## Phase 4 – Prerendered pages (M)

| # | Item | Notes |
| -- | -- | -- |
| 4.1 | `scripts/prerender.mjs` runs after `vite build` (part of `npm run build`): for every public route (home, 16 lobbies, stats, settings, privacy, imprint) it writes `dist/<path>/index.html` from the built `index.html` with: own `<title>`, description, canonical, `og:*` (image from phase 2), JSON-LD (`VideoGame` with name, description, genre, `isPartOf` the app) and static body content (see 4.2). Play routes (`/<game>/play/…`) get a copy with `noindex`. | Data from `src/games/*/i18n.ts` (`name`, `tagline`, rules texts) and the app catalogue, imported directly by Node |
| 4.2 | Static content of a game page: `h1` game name, tagline, "How to play" from the game's rules texts, the variants (difficulties / modes), a "Play" link, links to 3–4 related games and to the home page. Real `<a href>` links = internal linking. | Same text as the lobby → no duplicate-content or cloaking issue |
| 4.3 | `dist/sitemap.xml` with all indexable URLs (`lastmod` = build date). | Submitted in Search Console (robots.txt not possible, see A5) |
| 4.4 | CSP: every generated page keeps the meta CSP of `index.html` (same inline bootstrap script → same hash). `check-dist.mjs` verifies the policy on every HTML file. | |
| 4.5 | Client-side head updates: when navigating inside the app, update description, canonical and `og:url` together with the title (today only the title). | `core/routeFocus.ts` |
| 4.6 | `check-dist.mjs`: every public route has a file with unique title/description, canonical = its own URL, valid JSON-LD, `h1`; play files carry `noindex`; sitemap lists exactly the public routes. Size budget unchanged (HTML is small). | |

## Phase 5 – Launch and measurement (S)

| # | Item | Notes |
| -- | -- | -- |
| 5.1 | Search Console: verify (1.6), submit the sitemap, request indexing of home and game pages. Same in Bing Webmaster Tools (also feeds DuckDuckGo, Ecosia). | Owner, needs the account |
| 5.2 | Check link previews: WhatsApp, Signal, Telegram, Slack, Mastodon with a challenge link and the app link. | manual |
| 5.3 | Rich results test and Schema validator for home and two game pages. | manual |
| 5.4 | After 4–8 weeks: review impressions per page and queries; adjust descriptions/taglines. | |

## Phase 6 – Content (S, ongoing)

| # | Item | Notes |
| -- | -- | -- |
| 6.1 | README and GitHub repository description/topics with the game names and "offline puzzle games PWA" (the repo page ranks too and links to the app). | |
| 6.2 | Taglines written for people, not keywords: what the game is, what makes it special here (logic-solvable, no guessing, offline, no ads). | catalogues |

## Phase 7 – German pages (M, optional – Q3)

| # | Item | Notes |
| -- | -- | -- |
| 7.1 | Prerender every public page also under `/riddles/de/…` from the German catalogues, `<html lang="de">`; the app starts in German there unless the player chose another language in the settings. | router base per language or a `lang` prefix route |
| 7.2 | `hreflang` (`en`, `de`, `x-default`) on both versions, both in the sitemap. | |
| 7.3 | Language switch in the settings keeps the player on the same page in the other language. | |

## Non-goals

- Analytics, tracking pixels, cookies or any third-party script.
- Server-side rendering of the live app or a backend.
- Ads, link exchanges, keyword stuffing, hidden text.
- AMP or separate mobile pages.

## Risks

| Risk | Mitigation |
| -- | -- |
| Shared hash links and installed apps break | 3.2 rewrites `#/…` on start; e2e tests for old links; keep the shim long-term |
| Service worker of an old version serves old `index.html` for new paths | Update banner flow; old version still understands its own hash URLs; test the upgrade path (3.5) |
| Unknown paths get HTTP 404 from GitHub Pages | Only truly unknown paths reach `404.html`; all real routes have files (4.1) |
| Static content flashes or shifts before the app mounts | Same styles as the app, short content; measure layout shift on a phone |
| Prerendered text drifts from the app | Generated from the same catalogues on every build; `check-dist.mjs` checks every page |
| Duplicate URLs (`/sudoku` vs `/sudoku/`, query strings) | Canonical with trailing slash on every page; GitHub Pages redirects the slash-less form |

## Work packages

| # | Package | Phases | Effort |
| -- | -- | -- | -- |
| WP1 | Meta, previews and static start content | 1, 2 | S–M |
| WP2 | History routing with legacy-hash shim | 3 | M–L |
| WP3 | Prerender, sitemap, checks | 4 | M |
| WP4 | Launch and measurement | 5, 6 | S |
| WP5 | German pages (if decided) | 7 | M |

WP1 can ship on its own and already fixes A2–A5 for the home page. WP2 and WP3 belong
together in one release (paths without prerendered pages would be worse than today).

## Open questions for the owner

| # | Question |
| -- | -- |
| Q1 | Search Console / Bing: verification codes (meta tags) – or verify the whole `stefanniedermaier.github.io` domain? |
| Q2 | Custom domain (e.g. `riddles.<your-domain>`)? Easier branding and a `robots.txt` of its own; would move all URLs once – better before WP2 than after. |
| Q3 | German pages (phase 7) now, later or not at all? |
| Q4 | Rename the URL `crowns` to `stars`? |
| Q5 | Is there a user-site repository (`stefanniedermaier.github.io`) where a host-level `robots.txt` with the sitemap URL can live? |
