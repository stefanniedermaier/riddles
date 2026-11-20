import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { DIFFICULTIES, type Difficulty } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'sudoku:current:v1'

/** Storage key of the prefetched puzzles (one per difficulty). */
export const POOL_KEY = 'sudoku:pool:v1'

export const descriptor: GameDescriptor = {
  id: 'sudoku',
  variants: DIFFICULTIES,
  statKind: 'time',
  variantLabel: (variant) => t(`difficulty.${variant as Difficulty}`),
  hasSavedGame: () => has(SAVE_KEY),
  settingsComponent: () => import('./SudokuSettings.vue'),
}
