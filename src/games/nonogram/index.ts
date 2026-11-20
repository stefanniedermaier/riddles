import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { DIFFICULTIES, SIZES, type Difficulty } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'nonogram:current:v1'

/** "10×10" etc. (columns × rows). */
export function sizeLabel(difficulty: Difficulty): string {
  return t('nonogram.sizeLabel', SIZES[difficulty])
}

export const descriptor: GameDescriptor = {
  id: 'nonogram',
  variants: DIFFICULTIES,
  statKind: 'time',
  variantLabel: (variant) =>
    t('nonogram.variantLabel', {
      difficulty: t(`difficulty.${variant as Difficulty}`),
      size: sizeLabel(variant as Difficulty),
    }),
  hasSavedGame: () => has(SAVE_KEY),
  settingsComponent: () => import('./NonogramSettings.vue'),
}
