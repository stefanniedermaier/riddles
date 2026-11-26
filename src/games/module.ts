import type { RouteRecordRaw } from 'vue-router'

import type { GameDescriptor } from './types'

/**
 * Everything the app shell needs from a game – the game API. Each game exports one from
 * `src/games/<id>/module.ts`, and `src/games/modules.ts` lists them. Registry, router
 * and the `GameId` type are derived from that list. Texts are not part of the module: they
 * live in `i18n.ts` / `i18n.de.ts` and are bundled per language (`src/i18n/locales/`), so
 * only the active language is loaded.
 */
export interface GameModule<Id extends string = string> {
  /** Folder name, route prefix, i18n namespace and storage prefix (`<id>:…`). */
  id: Id
  /** Variants, statistics kind, saved-game check and optional settings panel. */
  descriptor: GameDescriptor
  /** Usually a lobby (`/<id>`) and a play view (`/<id>/play`), lazy-loaded. */
  routes: RouteRecordRaw[]
}

/** Declares a game module (keeps the literal id for typing). */
export function defineGame<const Id extends string>(module: GameModule<Id>): GameModule<Id> {
  return module
}
