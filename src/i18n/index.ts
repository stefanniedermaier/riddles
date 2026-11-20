import * as crowns from '@/games/crowns/i18n'
import * as shapes from '@/games/shapes/i18n'
import * as sudoku from '@/games/sudoku/i18n'

import de from './de'
import en from './en'
import type { MessageKeys, Messages } from './types'

const enMessages = {
  ...en,
  sudoku: sudoku.en,
  crowns: crowns.en,
  shapes: shapes.en,
}

export type MessageSchema = typeof enMessages
export type MessageKey = MessageKeys<MessageSchema>

const deMessages: Messages<MessageSchema> = {
  ...de,
  sudoku: sudoku.de,
  crowns: crowns.de,
  shapes: shapes.de,
}

export const messages = { en: enMessages, de: deMessages }
