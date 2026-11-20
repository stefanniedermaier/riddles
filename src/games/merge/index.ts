import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'

export const VARIANTS = ['small', 'classic', 'large'] as const
export type Variant = (typeof VARIANTS)[number]

/** Storage key of the running game of a variant. */
export const saveKey = (variant: Variant): string => `merge:current:${variant}:v1`

export const descriptor: GameDescriptor = {
  id: 'merge',
  variants: VARIANTS,
  statKind: 'score',
  variantLabel: (variant) => t(`merge.variants.${variant as Variant}`),
  hasSavedGame: () => VARIANTS.some((variant) => has(saveKey(variant))),
}
