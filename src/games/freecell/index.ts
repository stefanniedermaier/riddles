import { t } from '@/core/i18n'
import { cardSaveKey } from '@/core/cards/game'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { VARIANTS, type Variant } from './logic/variants'

export const descriptor: GameDescriptor = {
  id: 'freecell',
  variants: VARIANTS,
  statKind: 'both',
  variantLabel: (variant) => t(`freecell.variants.${variant as Variant}`),
  hasSavedGame: () => has(cardSaveKey('freecell')),
  settingsComponent: () => import('./FreeCellSettings.vue'),
}
