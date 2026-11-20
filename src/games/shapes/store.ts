/**
 * Persistence of Shapes runs and level progress.
 *
 * - `shapes:current:<mode>:v1` – the running Zen / Time game (see `ShapesRun`)
 * - `shapes:current:levels:v2` – the running level (with obstacles)
 * - `shapes:progress:v2`       – the level to play next (levels are played in order)
 *
 * Older data is migrated: the highest unlocked level of `shapes:progress:v1` becomes the
 * current level; a level run saved in the old format (`shapes:current:levels:v1`) is dropped.
 */
import { load, remove, save, usePersistentRef } from '@/core/storage'

import { saveKey } from './index'
import { parseRun, type ShapesRun } from './logic/modes'
import type { Mode } from './logic/types'

const LEGACY_PROGRESS_KEY = 'shapes:progress:v1'
const LEGACY_LEVEL_RUN_KEY = 'shapes:current:levels:v1'

export function loadRun(mode: Mode): ShapesRun | null {
  return load<ShapesRun | null>(saveKey(mode), null, (raw) => parseRun(raw, mode) ?? undefined)
}

export function saveRun(run: ShapesRun): void {
  save(saveKey(run.mode), run)
}

export function clearRun(mode: Mode): void {
  remove(saveKey(mode))
}

export interface LevelProgressStore {
  /** The level that is played next (all levels below it are completed). */
  level: number
}

function legacyLevel(): number {
  const legacy = load<{ unlocked?: unknown } | null>(LEGACY_PROGRESS_KEY, null)
  const unlocked = legacy?.unlocked
  return Number.isInteger(unlocked) && (unlocked as number) >= 1 ? (unlocked as number) : 1
}

export const levelProgress = usePersistentRef<LevelProgressStore>(
  'shapes:progress:v2',
  { level: legacyLevel() },
  {
    parse: (raw) => {
      if (typeof raw !== 'object' || raw === null) return undefined
      const level = (raw as Partial<LevelProgressStore>).level
      return { level: Number.isInteger(level) && level! >= 1 ? level! : 1 }
    },
  },
)

// One-time cleanup of the old formats (the progress was taken over above).
remove(LEGACY_PROGRESS_KEY)
remove(LEGACY_LEVEL_RUN_KEY)

/** A level was won: the next one becomes the current level. */
export function recordLevelWin(level: number): void {
  levelProgress.value.level = Math.max(levelProgress.value.level, level + 1)
}
