import { t } from '@/core/i18n'
import { cardSaveKey } from '@/core/cards/game'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { VARIANTS, type Variant } from './logic/variants'

export const descriptor: GameDescriptor = {
  id: 'spider',
  variants: VARIANTS,
  statKind: 'both',
  variantLabel: (variant) => t(`spider.variants.${variant as Variant}`),
  hasSavedGame: () => has(cardSaveKey('spider')),
  settingsComponent: () => import('./SpiderSettings.vue'),
}
