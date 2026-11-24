import { useGameSettings } from '@/core/settings'

interface MinesSettings extends Record<string, boolean> {
  /** A long press does the other tool's action (flag instead of reveal and vice versa). */
  longPress: boolean
  /** Tapping a number with enough flags around it reveals its other neighbours. */
  chord: boolean
  /** Wrong flags are shown and counted right away (otherwise only by "Check"). */
  instantMistakes: boolean
}

/** Mines settings, persisted under `riddles:mines:settings`. */
export const minesSettings = useGameSettings<MinesSettings>('mines', {
  longPress: true,
  chord: true,
  instantMistakes: false,
})
