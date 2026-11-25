import { t } from '@/core/i18n'
import { defineSaveSlot } from '@/core/saveSlot'
import type { GameDescriptor } from '../types'
import { DIFFICULTIES, SIZES, type Difficulty, isMinesSave } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'mines:current:v1'

/** The running game (validated, shared by Home, lobby and play view). */
export const saveSlot = defineSaveSlot(SAVE_KEY, isMinesSave)

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
  hasSavedGame: () => saveSlot.exists(),
  settingsComponent: () => import('./MinesSettings.vue'),
}
