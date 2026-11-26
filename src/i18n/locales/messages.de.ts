/** All German texts (see `messages.en.ts`); typed so that every English key is translated. */
import shell from '../de'
import type { Messages } from '../types'
import type en from './messages.en'
import { de as arrows } from '@/games/arrows/i18n.de'
import { de as blocks } from '@/games/blocks/i18n.de'
import { de as codebreaker } from '@/games/codebreaker/i18n.de'
import { de as crowns } from '@/games/crowns/i18n.de'
import { de as freecell } from '@/games/freecell/i18n.de'
import { de as links } from '@/games/links/i18n.de'
import { de as merge } from '@/games/merge/i18n.de'
import { de as mines } from '@/games/mines/i18n.de'
import { de as nonogram } from '@/games/nonogram/i18n.de'
import { de as pipes } from '@/games/pipes/i18n.de'
import { de as shapes } from '@/games/shapes/i18n.de'
import { de as solitaire } from '@/games/solitaire/i18n.de'
import { de as spider } from '@/games/spider/i18n.de'
import { de as sudoku } from '@/games/sudoku/i18n.de'
import { de as tripeaks } from '@/games/tripeaks/i18n.de'
import { de as watersort } from '@/games/watersort/i18n.de'

const de: Messages<typeof en> = {
  ...shell,
  arrows,
  blocks,
  codebreaker,
  crowns,
  freecell,
  links,
  merge,
  mines,
  nonogram,
  pipes,
  shapes,
  solitaire,
  spider,
  sudoku,
  tripeaks,
  watersort,
}

export default de
