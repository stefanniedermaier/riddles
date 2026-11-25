import { t } from '@/core/i18n'
import { defineSaveSlot } from '@/core/saveSlot'
import type { GameDescriptor } from '../types'
import { DIFFICULTIES, PARAMS, type Difficulty, isCodeSave } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'codebreaker:current:v1'

/** The running game (validated, shared by Home, lobby and play view). */
export const saveSlot = defineSaveSlot(SAVE_KEY, isCodeSave)

/** "4 positions · 6 colours" etc. */
export function sizeLabel(difficulty: Difficulty): string {
  const { positions, colors } = PARAMS[difficulty]
  return t('codebreaker.sizeLabel', { positions, colors })
}

export const descriptor: GameDescriptor = {
  id: 'codebreaker',
  variants: DIFFICULTIES,
  statKind: 'time',
  variantLabel: (variant) =>
    t('codebreaker.variantLabel', {
      difficulty: t(`difficulty.${variant as Difficulty}`),
      size: sizeLabel(variant as Difficulty),
    }),
  hasSavedGame: () => saveSlot.exists(),
  settingsComponent: () => import('./CodeBreakerSettings.vue'),
}
