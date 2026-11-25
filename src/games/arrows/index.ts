import { t } from '@/core/i18n'
import { defineSaveSlot } from '@/core/saveSlot'
import type { GameDescriptor } from '../types'
import { DIFFICULTIES, SIZES, type Difficulty, isArrowsSave } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'arrows:current:v1'

/** The running game (validated, shared by Home, lobby and play view). */
export const saveSlot = defineSaveSlot(SAVE_KEY, isArrowsSave)

/** "6×6" etc. */
export function sizeLabel(difficulty: Difficulty): string {
  return t('arrows.sizeLabel', { size: SIZES[difficulty] })
}

export const descriptor: GameDescriptor = {
  id: 'arrows',
  variants: DIFFICULTIES,
  statKind: 'time',
  variantLabel: (variant) =>
    t('arrows.variantLabel', {
      difficulty: t(`difficulty.${variant as Difficulty}`),
      size: sizeLabel(variant as Difficulty),
    }),
  hasSavedGame: () => saveSlot.exists(),
  settingsComponent: () => import('./ArrowsSettings.vue'),
}
