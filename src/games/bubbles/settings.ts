import { useGameSettings } from '@/core/settings'

/** How far the aim line reaches. */
export const AIM_LINES = ['short', 'target', 'full'] as const
export type AimLine = (typeof AIM_LINES)[number]
export const isAimLine = (value: unknown): value is AimLine => AIM_LINES.includes(value as AimLine)

/** Bubbles settings, persisted under `riddles:bubbles:settings`. */
export const bubblesSettings = useGameSettings('bubbles', {
  /** `short`: first stretch only, `target`: up to the first bubble, `full`: plus the landing cell. */
  aimLine: 'target',
  /** A symbol on every bubble, so colours are told apart without colour vision. */
  symbols: true,
  /** Speed of new time runs (`slow`, `normal`, `fast`); a run keeps its speed. */
  speed: 'normal',
})
