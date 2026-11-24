import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { DIFFICULTIES, SIZES, type Difficulty } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'pipes:current:v1'

/** "7×7" etc. (columns × rows). */
export function sizeLabel(difficulty: Difficulty): string {
  return t('pipes.sizeLabel', { ...SIZES[difficulty] })
}

export const descriptor: GameDescriptor = {
  id: 'pipes',
  variants: DIFFICULTIES,
  statKind: 'time',
  variantLabel: (variant) =>
    t('pipes.variantLabel', {
      difficulty: t(`difficulty.${variant as Difficulty}`),
      size: sizeLabel(variant as Difficulty),
    }),
  hasSavedGame: () => has(SAVE_KEY),
}
