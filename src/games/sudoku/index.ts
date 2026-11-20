import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import {
  DIFFICULTIES,
  MINI_DIFFICULTIES,
  MODES,
  isDifficulty,
  statVariant,
  type Difficulty,
  type SudokuMode,
} from './logic/types'

export { DIFFICULTIES, MINI_DIFFICULTIES, MODES, type Difficulty, type SudokuMode }

/** Storage key of the running classic game (format unchanged since v1). */
export const SAVE_KEY = 'sudoku:current:v1'
/** Storage key of the running mini game. */
export const MINI_SAVE_KEY = 'sudoku:mini:current:v1'

/** Storage keys of the prefetched puzzles (one per difficulty). */
export const POOL_KEY = 'sudoku:pool:v1'
export const MINI_POOL_KEY = 'sudoku:mini:pool:v1'

export const saveKeyOf = (mode: SudokuMode): string => (mode === 'mini' ? MINI_SAVE_KEY : SAVE_KEY)
export const poolKeyOf = (mode: SudokuMode): string => (mode === 'mini' ? MINI_POOL_KEY : POOL_KEY)

/** Statistics variants: classic difficulties keep their plain ids, mini ones are prefixed. */
const VARIANTS = [...DIFFICULTIES, ...MINI_DIFFICULTIES.map((d) => statVariant('mini', d))]

export const descriptor: GameDescriptor = {
  id: 'sudoku',
  variants: VARIANTS,
  statKind: 'time',
  variantLabel: (variant) => {
    const mini = variant.startsWith('mini-')
    const difficulty = mini ? variant.slice(5) : variant
    if (!isDifficulty(difficulty)) return variant
    const label = t(`difficulty.${difficulty}`)
    return mini ? `${t('sudoku.modes.miniShort')} · ${label}` : label
  },
  hasSavedGame: () => has(SAVE_KEY) || has(MINI_SAVE_KEY),
  settingsComponent: () => import('./SudokuSettings.vue'),
}
