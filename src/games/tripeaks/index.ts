import { t } from '@/core/i18n'
import { cardSaveKey } from '@/core/cards/game'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { VARIANTS, type Variant } from './logic/variants'

export const descriptor: GameDescriptor = {
  id: 'tripeaks',
  variants: VARIANTS,
  statKind: 'both',
  variantLabel: (variant) => t(`tripeaks.variants.${variant as Variant}`),
  hasSavedGame: () => has(cardSaveKey('tripeaks')),
  settingsComponent: () => import('./TriPeaksSettings.vue'),
}
