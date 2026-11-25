import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'

const VARIANTS = ['classic'] as const
type Variant = (typeof VARIANTS)[number]

/** Storage key of the running game. */
export const SAVE_KEY = 'blocks:current:v1'

export const descriptor: GameDescriptor = {
  id: 'blocks',
  variants: VARIANTS,
  statKind: 'score',
  variantLabel: (variant) => t(`blocks.variants.${variant as Variant}`),
  hasSavedGame: () => has(SAVE_KEY),
}
