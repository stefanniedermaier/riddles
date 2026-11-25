/**
 * Global test setup: jsdom has no canvas. Its `getContext()` logs "Not implemented" on every
 * call, so it is stubbed to return `null` – particle layers then simply draw nothing.
 */
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext
