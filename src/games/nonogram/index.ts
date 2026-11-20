import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/** Storage key of the running game. */
export const SAVE_KEY = 'nonogram:current:v1'

export const descriptor: GameDescriptor = {
  id: 'nonogram',
  variants: DIFFICULTIES,
  statKind: 'time',
  variantLabel: (variant) => t(`difficulty.${variant as Difficulty}`),
  hasSavedGame: () => has(SAVE_KEY),
}
