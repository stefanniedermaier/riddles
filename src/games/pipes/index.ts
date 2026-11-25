import { t } from '@/core/i18n'
import { defineSaveSlot } from '@/core/saveSlot'
import type { GameDescriptor } from '../types'
import { DIFFICULTIES, SIZES, SOURCE_COUNT, type Difficulty, isPipesSave } from './logic/types'

export { DIFFICULTIES, type Difficulty }

/** Storage key of the running game. */
export const SAVE_KEY = 'pipes:current:v1'

/** The running game (validated, shared by Home, lobby and play view). */
export const saveSlot = defineSaveSlot(SAVE_KEY, isPipesSave)

/** "7×7" etc. (columns × rows), plus the number of sources when there are several. */
export function sizeLabel(difficulty: Difficulty): string {
  const size = t('pipes.sizeLabel', { ...SIZES[difficulty] })
  const sources = SOURCE_COUNT[difficulty]
  return sources > 1 ? `${size} · ${t('pipes.sources', { n: sources })}` : size
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
  hasSavedGame: () => saveSlot.exists(),
}
