/**
 * Persistence of Shapes runs and level progress.
 *
 * - `shapes:current:<mode>:v1` – the running game of a mode (see `ShapesRun`)
 * - `shapes:progress:v1`       – highest unlocked level and best stars per level
 */
import { load, remove, save, usePersistentRef } from '@/core/storage'

import { saveKey } from './index'
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
  /** Highest level that may be played. */
  unlocked: number
  /** Best stars per level number. */
  stars: Record<string, number>
}

export const levelProgress = usePersistentRef<LevelProgressStore>(
  'shapes:progress:v1',
  { unlocked: 1, stars: {} },
  {
    parse: (raw) => {
      if (typeof raw !== 'object' || raw === null) return undefined
      const r = raw as Partial<LevelProgressStore>
      return {
        unlocked: Number.isInteger(r.unlocked) && r.unlocked! >= 1 ? r.unlocked! : 1,
        stars: typeof r.stars === 'object' && r.stars !== null ? r.stars : {},
      }
    },
  },
)

/** Records a completed level: unlocks the next one and keeps the best stars. */
export function recordLevelWin(level: number, stars: number): void {
  const progress = levelProgress.value
  progress.unlocked = Math.max(progress.unlocked, level + 1)
  const key = String(level)
  progress.stars[key] = Math.max(progress.stars[key] ?? 0, stars)
}
