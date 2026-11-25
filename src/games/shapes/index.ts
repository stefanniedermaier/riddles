import { t } from '@/core/i18n'
import { has, load, remove, save } from '@/core/storage'
import type { GameDescriptor } from '../types'
import { MODES, type Mode } from './logic/types'

export type { Mode }

/** Storage key of the running game of a mode (levels: v2 since obstacles were added). */
export const saveKey = (mode: Mode): string =>
  mode === 'levels' ? 'shapes:current:levels:v2' : `shapes:current:${mode}:v1`

/** The level to play next (levels are played in order). */
export const PROGRESS_KEY = 'shapes:progress:v2'

/**
 * Older data: the highest unlocked level of `shapes:progress:v1` becomes the current level;
 * a level run in the old format (`shapes:current:levels:v1`, no obstacles) is dropped.
 */
function migrate(): void {
  const legacyProgress = 'shapes:progress:v1'
  if (has(legacyProgress)) {
    const unlocked = load<{ unlocked?: unknown } | null>(legacyProgress, null)?.unlocked
    if (!has(PROGRESS_KEY) && Number.isInteger(unlocked) && (unlocked as number) >= 1) {
      save(PROGRESS_KEY, { level: unlocked })
    }
    remove(legacyProgress)
  }
  remove('shapes:current:levels:v1')
}

export const descriptor: GameDescriptor = {
  id: 'shapes',
  variants: MODES,
  statKind: 'score',
  variantLabel: (variant) => t(`shapes.modes.${variant as Mode}`),
  // Zen is endless and always running, so it never counts as a game to continue on the home
  // screen (the Shapes menu still offers to continue it).
  hasSavedGame: () => MODES.some((mode) => mode !== 'zen' && has(saveKey(mode))),
  migrate,
  settingsComponent: () => import('./ShapesSettings.vue'),
}
