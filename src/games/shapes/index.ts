import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'

export const MODES = ['zen', 'time', 'levels'] as const
export type Mode = (typeof MODES)[number]

/** Storage key of the running game of a mode. */
export const saveKey = (mode: Mode): string => `shapes:current:${mode}:v1`

export const descriptor: GameDescriptor = {
  id: 'shapes',
  variants: MODES,
  statKind: 'score',
  variantLabel: (variant) => variant,
  hasSavedGame: () => MODES.some((mode) => has(saveKey(mode))),
}
