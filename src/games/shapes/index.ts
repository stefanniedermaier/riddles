import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { MODES, type Mode } from './logic/types'

export { MODES, type Mode }

/** Storage key of the running game of a mode. */
export const saveKey = (mode: Mode): string => `shapes:current:${mode}:v1`

export const descriptor: GameDescriptor = {
  id: 'shapes',
  variants: MODES,
  statKind: 'score',
  variantLabel: (variant) => t(`shapes.modes.${variant as Mode}`),
  hasSavedGame: () => MODES.some((mode) => has(saveKey(mode))),
  settingsComponent: () => import('./ShapesSettings.vue'),
}
