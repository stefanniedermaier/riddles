import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
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
        const scriptHashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          (match) => `'sha256-${createHash('sha256').update(match[1] ?? '').digest('base64')}'`,
        )
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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
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
