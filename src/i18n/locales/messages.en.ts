/**
 * All English texts: the app shell plus every game under its id. Loaded on demand like the
 * German ones (`src/core/i18n.ts`), so the start bundle holds only one language. Each game
 * listed in `src/games/modules.ts` needs its entry here (checked by a test).
 */
import shell from '../en'
import { en as arrows } from '@/games/arrows/i18n'
import { en as blocks } from '@/games/blocks/i18n'
import { en as codebreaker } from '@/games/codebreaker/i18n'
import { en as crowns } from '@/games/crowns/i18n'
import { en as freecell } from '@/games/freecell/i18n'
import { en as links } from '@/games/links/i18n'
import { en as merge } from '@/games/merge/i18n'
import { en as mines } from '@/games/mines/i18n'
import { en as nonogram } from '@/games/nonogram/i18n'
import { en as pipes } from '@/games/pipes/i18n'
import { en as shapes } from '@/games/shapes/i18n'
import { en as solitaire } from '@/games/solitaire/i18n'
import { en as spider } from '@/games/spider/i18n'
import { en as sudoku } from '@/games/sudoku/i18n'
import { en as tripeaks } from '@/games/tripeaks/i18n'
import { en as watersort } from '@/games/watersort/i18n'

export default {
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
