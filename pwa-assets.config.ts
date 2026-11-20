import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PWA / favicon / Apple touch icons from public/logo.svg.
// Run with `npm run icons`; the generated PNG/ICO files are committed.
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#5b4bdb' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#5b4bdb' } },
  },
  images: ['public/logo.svg'],
})
