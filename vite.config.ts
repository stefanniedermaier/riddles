import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

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
          .filter((match) => !/\bsrc\s*=/i.test(match[1] ?? ''))
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

// https://vite.dev/config/
export default defineConfig({
  // The app is served from https://<user>.github.io/riddles/
  base: '/riddles/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    vue(),
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
        description: 'Sudoku, Crowns and Shapes – puzzle games that work offline.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#f6f5f2',
        background_color: '#f6f5f2',
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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,txt}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  worker: {
    format: 'es',
  },
})
