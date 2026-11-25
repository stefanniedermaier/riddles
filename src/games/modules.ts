import arrows from './arrows/module'
import blocks from './blocks/module'
import codebreaker from './codebreaker/module'
import crowns from './crowns/module'
import freecell from './freecell/module'
import links from './links/module'
import merge from './merge/module'
import mines from './mines/module'
import nonogram from './nonogram/module'
import pipes from './pipes/module'
import shapes from './shapes/module'
import solitaire from './solitaire/module'
import spider from './spider/module'
import sudoku from './sudoku/module'
import tripeaks from './tripeaks/module'
import watersort from './watersort/module'

/**
 * All games in their default display order – the only list of games in the app.
 * Adding a game means adding its module here (see docs/architecture.md).
 */
export const gameModules = [sudoku, crowns, links, nonogram, arrows, shapes, merge, blocks, mines, pipes, watersort, codebreaker, solitaire, spider, freecell, tripeaks] as const

export type GameId = (typeof gameModules)[number]['id']
