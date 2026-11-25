import { t } from '@/core/i18n'
import { defineSaveSlot } from '@/core/saveSlot'
import type { GameDescriptor } from '../types'
import { DIFFICULTIES, SIZES, type Difficulty, isCrownsSave } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'crowns:current:v1'

/** The running game (validated, shared by Home, lobby and play view). */
export const saveSlot = defineSaveSlot(SAVE_KEY, isCrownsSave)

/** "6×6" or "7–8" for difficulties with several sizes. */
export function sizeLabel(difficulty: Difficulty): string {
  const sizes = SIZES[difficulty]
  if (sizes.length === 1) return t('crowns.sizeLabel', { size: sizes[0]! })
  return `${sizes[0]}–${sizes[sizes.length - 1]}`
}

export const descriptor: GameDescriptor = {
  id: 'crowns',
  variants: DIFFICULTIES,
  statKind: 'time',
  variantLabel: (variant) =>
    t('crowns.variantLabel', {
      difficulty: t(`difficulty.${variant as Difficulty}`),
      size: sizeLabel(variant as Difficulty),
    }),
  hasSavedGame: () => saveSlot.exists(),
  settingsComponent: () => import('./CrownsSettings.vue'),
}
