import { loadLocale } from '@/core/i18n'

/**
 * Global test setup: jsdom has no canvas. Its `getContext()` logs "Not implemented" on every
 * call, so it is stubbed to return `null` – particle layers then simply draw nothing.
 */
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext

// The app loads the texts of the active language before it mounts (src/main.ts); tests use
// `t` directly and switch languages, so both catalogues are loaded up front.
await Promise.all([loadLocale('en'), loadLocale('de')])
