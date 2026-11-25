import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { VARIANTS, type Variant } from './logic/variants'

export const descriptor: GameDescriptor = {
  id: 'freecell',
  variants: VARIANTS,
  statKind: 'both',
  variantLabel: (variant) => t(`freecell.variants.${variant as Variant}`),
  hasSavedGame: () => has('freecell:current:v1'),
  settingsComponent: () => import('./FreeCellSettings.vue'),
}
