import { t } from '@/core/i18n'
import { defineSaveSlot } from '@/core/saveSlot'
import type { GameDescriptor } from '../types'
import { COLORS, DIFFICULTIES, type Difficulty, isWaterSortSave } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'watersort:current:v1'

/** The running game (validated, shared by Home, lobby and play view). */
export const saveSlot = defineSaveSlot(SAVE_KEY, isWaterSortSave)

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
  hasSavedGame: () => saveSlot.exists(),
  settingsComponent: () => import('./WaterSortSettings.vue'),
}
