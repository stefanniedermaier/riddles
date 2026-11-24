import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { DIFFICULTIES, SIZES, type Difficulty } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'mines:current:v1'

/** "8×10 · 12 mines" etc. (columns × rows). */
export function sizeLabel(difficulty: Difficulty): string {
  return t('mines.sizeLabel', { ...SIZES[difficulty] })
}

export const descriptor: GameDescriptor = {
  id: 'mines',
  variants: DIFFICULTIES,
  statKind: 'time',
  variantLabel: (variant) =>
    t('mines.variantLabel', {
      difficulty: t(`difficulty.${variant as Difficulty}`),
      size: t('mines.boardLabel', { ...SIZES[variant as Difficulty] }),
    }),
  hasSavedGame: () => has(SAVE_KEY),
  settingsComponent: () => import('./MinesSettings.vue'),
}
