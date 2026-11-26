import type en from './locales/messages.en'
import type { MessageKeys, Messages } from './types'

/** All texts: the app shell plus every game under its id, e.g. `sudoku.name`. */
type MessageSchema = typeof en
export type MessageKey = MessageKeys<MessageSchema>
export type Catalogue = Messages<MessageSchema>

/**
 * Loaders of the per-language catalogues. Separate chunks, so the start bundle holds only
 * the active language; the service worker precaches both, so switching works offline.
 */
export const catalogueLoaders = {
  en: () => import('./locales/messages.en'),
  de: () => import('./locales/messages.de'),
} satisfies Record<string, () => Promise<{ default: Catalogue }>>
