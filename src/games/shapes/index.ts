import { t } from '@/core/i18n'
import { has } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { MODES, type Mode } from './logic/types'

export { MODES, type Mode }

/** Storage key of the running game of a mode (levels: v2 since obstacles were added). */
export const saveKey = (mode: Mode): string =>
  mode === 'levels' ? 'shapes:current:levels:v2' : `shapes:current:${mode}:v1`

export const descriptor: GameDescriptor = {
  id: 'shapes',
  variants: MODES,
  statKind: 'score',
  variantLabel: (variant) => t(`shapes.modes.${variant as Mode}`),
  // Zen is endless and always running, so it never counts as a game to continue on the home
  // screen (the Shapes menu still offers to continue it).
  hasSavedGame: () => MODES.some((mode) => mode !== 'zen' && has(saveKey(mode))),
  settingsComponent: () => import('./ShapesSettings.vue'),
}
