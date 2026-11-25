/**
 * Persistence of Shapes runs and level progress.
 *
 * - `shapes:current:<mode>:v1` – the running Zen / Time game (see `ShapesRun`)
 * - `shapes:current:levels:v2` – the running level (with obstacles)
 * - `shapes:progress:v2`       – the level to play next (levels are played in order)
 *
 * Data of older versions is migrated at start-up (`migrate` in `index.ts`).
 */
import { load, remove, save, usePersistentRef } from '@/core/storage'

import { PROGRESS_KEY, saveKey } from './index'
import { parseRun, type ShapesRun } from './logic/modes'
import type { Mode } from './logic/types'

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

export const levelProgress = usePersistentRef<LevelProgressStore>(
  PROGRESS_KEY,
  { level: 1 },
  {
    parse: (raw) => {
      if (typeof raw !== 'object' || raw === null) return undefined
      const level = (raw as Partial<LevelProgressStore>).level
      return { level: Number.isInteger(level) && level! >= 1 ? level! : 1 }
    },
  },
)

/** A level was won: the next one becomes the current level. */
export function recordLevelWin(level: number): void {
  levelProgress.value.level = Math.max(levelProgress.value.level, level + 1)
}
