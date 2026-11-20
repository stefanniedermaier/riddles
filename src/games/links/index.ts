import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { DIFFICULTIES, SIZES, type Difficulty } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'links:current:v1'

/** "5×5" etc. */
export function sizeLabel(difficulty: Difficulty): string {
  return t('links.sizeLabel', { size: SIZES[difficulty] })
}

export const descriptor: GameDescriptor = {
  id: 'links',
  variants: DIFFICULTIES,
  statKind: 'time',
  variantLabel: (variant) =>
    t('links.variantLabel', {
      difficulty: t(`difficulty.${variant as Difficulty}`),
      size: sizeLabel(variant as Difficulty),
    }),
  hasSavedGame: () => has(SAVE_KEY),
  settingsComponent: () => import('./LinksSettings.vue'),
}
