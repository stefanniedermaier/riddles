import { t } from '@/core/i18n'
import { defineSaveSlot, type SaveSlot } from '@/core/saveSlot'
import type { GameDescriptor } from '../types'
import {
  DIFFICULTIES,
  MINI_DIFFICULTIES,
  isDifficulty,
  isSudokuSave,
  modeOfPuzzle,
  statVariant,
  type SudokuMode,
  type SudokuSave,
} from './logic/types'

export type { SudokuMode }

/** Storage key of the running classic game (format unchanged since v1). */
export const SAVE_KEY = 'sudoku:current:v1'
/** Storage key of the running mini game. */
export const MINI_SAVE_KEY = 'sudoku:mini:current:v1'

/** Storage keys of the prefetched puzzles (one per difficulty). */
const POOL_KEY = 'sudoku:pool:v1'
const MINI_POOL_KEY = 'sudoku:mini:pool:v1'

const slotFor = (key: string, mode: SudokuMode): SaveSlot<SudokuSave> =>
  defineSaveSlot(key, (raw): raw is SudokuSave => isSudokuSave(raw) && modeOfPuzzle(raw.puzzle) === mode)
const SLOTS: Record<SudokuMode, SaveSlot<SudokuSave>> = {
  classic: slotFor(SAVE_KEY, 'classic'),
  mini: slotFor(MINI_SAVE_KEY, 'mini'),
}

/** The running game of a mode (validated, shared by Home, lobby and play view). */
export const saveSlotOf = (mode: SudokuMode): SaveSlot<SudokuSave> => SLOTS[mode]
export const poolKeyOf = (mode: SudokuMode): string => (mode === 'mini' ? MINI_POOL_KEY : POOL_KEY)

/** Statistics variants: classic difficulties keep their plain ids, mini ones are prefixed. */
const VARIANTS = [...DIFFICULTIES, ...MINI_DIFFICULTIES.map((d) => statVariant('mini', d))]

export const descriptor: GameDescriptor = {
  id: 'sudoku',
  variants: VARIANTS,
  statKind: 'time',
  variantLabel: (variant) => {
    const mini = variant.startsWith('mini-')
    const difficulty = mini ? variant.slice(5) : variant
    if (!isDifficulty(difficulty)) return variant
    const label = t(`difficulty.${difficulty}`)
    return mini ? `${t('sudoku.modes.miniShort')} · ${label}` : label
  },
  hasSavedGame: () => SLOTS.classic.exists() || SLOTS.mini.exists(),
  settingsComponent: () => import('./SudokuSettings.vue'),
}
