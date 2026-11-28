import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { VARIANTS, type Variant } from './logic/types'

export { VARIANTS, type Variant }

/** Storage key of the running game of a mode. */
export const saveKey = (variant: Variant): string => `bubbles:current:${variant}:v1`

export const descriptor: GameDescriptor = {
  id: 'bubbles',
  variants: VARIANTS,
  statKind: 'score',
  variantLabel: (variant) => t(`bubbles.variants.${variant as Variant}`),
  hasSavedGame: () => VARIANTS.some((variant) => has(saveKey(variant))),
  settingsComponent: () => import('./BubblesSettings.vue'),
}
