import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { VARIANTS, type Variant } from './logic/variants'

export const descriptor: GameDescriptor = {
  id: 'solitaire',
  variants: VARIANTS,
  statKind: 'both',
  variantLabel: (variant) => t(`solitaire.variants.${variant as Variant}`),
  hasSavedGame: () => has('solitaire:current:v1'),
  settingsComponent: () => import('./SolitaireSettings.vue'),
}
