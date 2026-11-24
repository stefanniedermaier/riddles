import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { COLORS, DIFFICULTIES, type Difficulty } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'watersort:current:v1'

/** "6 colours" etc. */
export function sizeLabel(difficulty: Difficulty): string {
  return t('watersort.sizeLabel', { colors: COLORS[difficulty] })
}

export const descriptor: GameDescriptor = {
  id: 'watersort',
  variants: DIFFICULTIES,
  statKind: 'time',
  variantLabel: (variant) =>
    t('watersort.variantLabel', {
      difficulty: t(`difficulty.${variant as Difficulty}`),
      size: sizeLabel(variant as Difficulty),
    }),
  hasSavedGame: () => has(SAVE_KEY),
  settingsComponent: () => import('./WaterSortSettings.vue'),
}
