import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import { loadGames, pagesFor, renderPage } from './scripts/seo.ts'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

/**
 * Adds a strict Content-Security-Policy to the production index.html.
 * GitHub Pages cannot send HTTP headers, so the policy is delivered as a <meta> tag.
 * Inline scripts (the theme bootstrap in index.html) are allowed by their SHA-256 hash only.
 * Not applied in dev, where Vite's HMR client needs inline code and websockets.
 */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'riddles:content-security-policy',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Inline scripts only (external ones with src= are covered by 'self'); tag names are
        // case-insensitive and browsers also accept end tags with trailing content.
        const scriptHashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi)]
          // Not external scripts (covered by 'self') nor JSON-LD data blocks (never executed;
          // they differ per prerendered page).
          .filter((match) => !/\bsrc\s*=|application\/ld\+json/i.test(match[1] ?? ''))
          .map((match) => `'sha256-${createHash('sha256').update(match[2] ?? '').digest('base64')}'`)
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${scriptHashes.join(' ')}`.trim(),
          "style-src 'self'",
          "img-src 'self' data: blob:",
          "font-src 'self'",
          "connect-src 'self'",
          "worker-src 'self'",
          "manifest-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'none'",
          'upgrade-insecure-requests',
        ].join('; ')
        return html.replace(
          /<meta charset="UTF-8" \/>/,
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        )
      },
    },
  }
}

/**
 * Fills the English home page – which is also the app shell the service worker serves for
 * every page – with its search engine head and static content (scripts/seo.ts). All other
 * pages are written from the built file by scripts/prerender.ts.
 */
function homePage(): Plugin {
  return {
    name: 'riddles:home-page',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        const games = await loadGames()
        const home = pagesFor(games).find((page) => page.kind === 'home' && page.locale === 'en')!
        return renderPage(html, home, games)
      },
    },
  }
}

/**
 * Preloads the English texts (a chunk of their own, `src/i18n/locales/`) with the start
 * bundle, so they do not wait for main.js to ask for them. The German pages preload the
 * German texts instead (scripts/prerender.ts swaps the file).
 */
function preloadTexts(): Plugin {
  return {
    name: 'riddles:preload-texts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const chunk = Object.values(ctx.bundle ?? {}).find(
          (file) => file.type === 'chunk' && file.facadeModuleId?.endsWith('/src/i18n/locales/messages.en.ts'),
        )
        if (!chunk) throw new Error('preload-texts: English texts chunk not found')
        return [
          { tag: 'link', attrs: { rel: 'modulepreload', crossorigin: true, href: `/riddles/${chunk.fileName}` }, injectTo: 'head' },
        ]
      },
    },
  }
}

/**
 * Packages bundled into the service worker by Workbox (built outside the Rollup graph).
 * `scripts/check-dist.mjs` fails if the built service worker contains a Workbox module that is
 * missing here, so the list cannot silently go stale.
 */
const SERVICE_WORKER_PACKAGES = ['workbox-core', 'workbox-precaching', 'workbox-routing', 'workbox-strategies']

/**
 * Writes `licenses.txt` with the licence texts of every third-party package shipped to users
 * (MIT and similar licences require the copyright and licence notice in every copy; minified
 * bundles drop them).
 */
function thirdPartyLicenses(): Plugin {
  const root = fileURLToPath(new URL('.', import.meta.url))
  return {
    name: 'riddles:third-party-licenses',
    apply: 'build',
    generateBundle(_options, bundle) {
      const packages = new Set<string>(SERVICE_WORKER_PACKAGES)
      // Only modules that actually end up in the output (tree-shaken ones are not shipped).
      const shipped = Object.values(bundle).flatMap((chunk) =>
        chunk.type === 'chunk'
          ? Object.entries(chunk.modules)
              .filter(([, info]) => info.renderedLength > 0)
              .map(([id]) => id)
          : [],
      )
      for (const id of shipped) {
        const match = /node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/.exec(id)
        if (match?.[1]) packages.add(match[1].split(/[\\/]/).join('/'))
      }
      const entries = [...packages].sort().map((name) => {
        const dir = join(root, 'node_modules', name)
        const meta = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
          version: string
          license?: string
        }
        const file = existsSync(dir) ? readdirSync(dir).find((f) => /^licen[cs]e/i.test(f)) : undefined
        if (!file) throw new Error(`third-party-licenses: no licence file in ${name}`)
        const text = readFileSync(join(dir, file), 'utf8').trim()
        return `${name}@${meta.version} (${meta.license ?? 'see below'})\n\n${text}`
      })
      this.emitFile({
        type: 'asset',
        fileName: 'licenses.txt',
        source: `Riddles ${pkg.version} – third-party software\n\nThis app includes the following open-source packages.\n\n${entries.join(`\n\n${'-'.repeat(72)}\n\n`)}\n`,
      })
    },
  }
}

/**
 * Dark variant of the manifest colours (Web App Manifest draft, `color_scheme_dark`): Android
 * can colour the installed app's system bars – including the navigation bar – dark while the
 * phone is in dark mode. It follows the phone's setting, not the in-app theme; browsers
 * without support ignore it. Spread in, as vite-plugin-pwa's types do not know it yet.
 */
const darkManifestColors = {
  color_scheme_dark: { theme_color: '#15141b', background_color: '#15141b' },
}

// https://vite.dev/config/
export default defineConfig({
  // The app is served from https://<user>.github.io/riddles/
  base: '/riddles/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    vue(),
    homePage(),
    preloadTexts(),
    contentSecurityPolicy(),
    thirdPartyLicenses(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/riddles/',
        name: 'Riddles',
        short_name: 'Riddles',
        description:
          'Free puzzle games that work offline: Sudoku, Nonograms, Solitaire, Minesweeper and 14 more – no ads, no account, no tracking.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        // Shared links (challenges) open in the installed app where the browser supports it
        // (Chromium: link capturing; Android opens in-scope links in the app anyway).
        handle_links: 'preferred',
        launch_handler: { client_mode: ['navigate-existing', 'auto'] },
        // No `orientation` lock: Android does not let the app lift it again for the card
        // games' landscape layout. Portrait is requested at runtime (src/core/orientation.ts).
        theme_color: '#f6f5f2',
        background_color: '#f6f5f2',
        ...darkManifestColors,
        categories: ['games', 'puzzle'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Only the app shell (index.html) of all HTML: every page is the same app. The
        // prerendered pages, 404.html and sitemap.xml are written after this step and are
        // for crawlers; so are the link preview images (og/).
        globPatterns: ['**/*.{js,css,svg,png,ico,webmanifest,txt}', 'index.html'],
        globIgnores: ['og/**'],
        navigateFallback: 'index.html',
        // Only page addresses get the app shell. A file opened directly (sitemap.xml,
        // licenses.txt, a preview image …) must come from the network – otherwise the browser
        // shows the app's not-found page instead of the file.
        navigateFallbackDenylist: [/\/[^/?#]+\.[^/?#]+$/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Everything the start page needs in one chunk: left alone, the bundler splits off
          // each module that lazy chunks share (game descriptors, types, …) – 30 tiny files
          // that compress worse and cost a request each.
          groups: [{ name: 'app', tags: ['$initial'] }],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
})
