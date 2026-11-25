import { t } from '@/core/i18n'
import { defineSaveSlot } from '@/core/saveSlot'
import type { GameDescriptor } from '../types'
import { DIFFICULTIES, SIZES, type Difficulty, isNonogramSave } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'nonogram:current:v1'

/** The running game (validated, shared by Home, lobby and play view). */
export const saveSlot = defineSaveSlot(SAVE_KEY, isNonogramSave)

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
  hasSavedGame: () => saveSlot.exists(),
  settingsComponent: () => import('./NonogramSettings.vue'),
}
