import * as crowns from '@/games/crowns/i18n'
import * as links from '@/games/links/i18n'
import * as merge from '@/games/merge/i18n'
import * as nonogram from '@/games/nonogram/i18n'
import * as shapes from '@/games/shapes/i18n'
import * as sudoku from '@/games/sudoku/i18n'

import de from './de'
import en from './en'
import type { MessageKeys, Messages } from './types'

const enMessages = {
  ...en,
  sudoku: sudoku.en,
  crowns: crowns.en,
  links: links.en,
  nonogram: nonogram.en,
  merge: merge.en,
  shapes: shapes.en,
}

export type MessageSchema = typeof enMessages
export type MessageKey = MessageKeys<MessageSchema>

const deMessages: Messages<MessageSchema> = {
  ...de,
  sudoku: sudoku.de,
  crowns: crowns.de,
  links: links.de,
  nonogram: nonogram.de,
  merge: merge.de,
  shapes: shapes.de,
}

export const messages = { en: enMessages, de: deMessages }
