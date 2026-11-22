import type { RouteRecordRaw } from 'vue-router'

import type { Messages } from '@/i18n/types'
import type { GameDescriptor } from './types'

/**
 * Everything the app shell needs from a game – the game API. Each game exports one from
 * `src/games/<id>/module.ts`, and `src/games/modules.ts` lists them. Registry, router,
 * texts and the `GameId` type are all derived from that list.
 */
export interface GameModule<Id extends string = string, M extends object = object> {
  /** Folder name, route prefix, i18n namespace and storage prefix (`<id>:…`). */
  id: Id
  /** Variants, statistics kind, saved-game check and optional settings panel. */
  descriptor: GameDescriptor
  /** Usually a lobby (`/<id>`) and a play view (`/<id>/play`), lazy-loaded. */
  routes: RouteRecordRaw[]
  /** Texts under the namespace `<id>`; German must have exactly the English keys. */
  messages: { en: M; de: Messages<M> }
}

/** Declares a game module (keeps the literal id and the message shape for typing). */
export function defineGame<const Id extends string, M extends object>(
  module: GameModule<Id, M>,
): GameModule<Id, M> {
  return module
}
