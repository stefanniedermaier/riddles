import { gameModules } from '@/games/modules'

import de from './de'
import en from './en'
import type { MessageKeys, Messages } from './types'

type GameModuleList = typeof gameModules

/** Texts of every game under its id, e.g. `sudoku.name` (derived from the module list). */
type GameMessages = {
  [M in GameModuleList[number] as M['id']]: M['messages']['en']
}

type MessageSchema = typeof en & GameMessages
export type MessageKey = MessageKeys<MessageSchema>

export interface MessageCatalogue {
  en: MessageSchema
  de: Messages<MessageSchema>
}

let catalogue: MessageCatalogue | undefined

/** Shell texts plus the texts of every game under its id (shape known per module only). */
function withGames<T>(shell: object, games: Record<string, unknown>): T {
  return Object.assign({}, shell, games) as T
}

/**
 * Shell texts merged with the texts of all games. Built on first use: game modules import
 * `t`, so building it while the modules load would run into an import cycle.
 */
export function getMessages(): MessageCatalogue {
  if (!catalogue) {
    const of = (locale: 'en' | 'de') =>
      Object.fromEntries(gameModules.map((module) => [module.id, module.messages[locale]]))
    catalogue = {
      en: withGames<MessageSchema>(en, of('en')),
      de: withGames<Messages<MessageSchema>>(de, of('de')),
    }
  }
  return catalogue
}
