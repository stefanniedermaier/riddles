import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { VARIANTS, type Variant } from './logic/variants'

export const descriptor: GameDescriptor = {
  id: 'tripeaks',
  variants: VARIANTS,
  statKind: 'both',
  variantLabel: (variant) => t(`tripeaks.variants.${variant as Variant}`),
  hasSavedGame: () => has('tripeaks:current:v1'),
  settingsComponent: () => import('./TriPeaksSettings.vue'),
}
