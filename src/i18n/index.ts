import { gameModules } from '@/games/modules'

import de from './de'
import en from './en'
import type { MessageKeys, Messages } from './types'

type GameModuleList = typeof gameModules

/** Texts of every game under its id, e.g. `sudoku.name` (derived from the module list). */
type GameMessages = {
  [M in GameModuleList[number] as M['id']]: M['messages']['en']
}

export type MessageSchema = typeof en & GameMessages
export type MessageKey = MessageKeys<MessageSchema>

export interface MessageCatalogue {
  en: MessageSchema
  de: Messages<MessageSchema>
}

let catalogue: MessageCatalogue | undefined

/**
 * Shell texts merged with the texts of all games. Built on first use: game modules import
 * `t`, so building it while the modules load would run into an import cycle.
 */
export function getMessages(): MessageCatalogue {
  if (!catalogue) {
    const of = (locale: 'en' | 'de') =>
      Object.fromEntries(gameModules.map((module) => [module.id, module.messages[locale]]))
    catalogue = {
      en: { ...en, ...of('en') } as MessageSchema,
      de: { ...de, ...of('de') } as Messages<MessageSchema>,
    }
  }
  return catalogue
}
