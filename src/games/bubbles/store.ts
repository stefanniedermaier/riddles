/**
 * Persistence of Bubbles runs, level progress and records.
 *
 * - `bubbles:current:<variant>:v1` – the running game of a mode (saved after every shot)
 * - `bubbles:progress:v1`          – the level to play next and the best stars per level
 * - `bubbles:records:v1`           – the speed the best time score was reached with
 */
import { isInt } from '@/core/guards'
import { load, remove, save, usePersistentRef } from '@/core/storage'

import { saveKey, type Variant } from './index'
import { parseRun, type BubblesRun } from './logic/engine'
import { isSpeed, type Speed } from './logic/types'

export function loadRun(variant: Variant): BubblesRun | null {
  return load<BubblesRun | null>(saveKey(variant), null, (raw) => parseRun(raw, variant))
}

export function saveRun(run: BubblesRun): void {
  save(saveKey(run.variant), run)
}

export function clearRun(variant: Variant): void {
  remove(saveKey(variant))
}

export interface LevelProgress {
  /** The level that is played next (all levels below it are completed). */
  level: number
  /** Best stars per completed level (index = level − 1). */
  stars: number[]
}

export const levelProgress = usePersistentRef<LevelProgress>(
  'bubbles:progress:v1',
  { level: 1, stars: [] },
  {
    parse: (raw) => {
      if (typeof raw !== 'object' || raw === null) return undefined
      const { level, stars } = raw as Partial<LevelProgress>
      return {
        level: isInt(level) && level >= 1 ? level : 1,
        stars: Array.isArray(stars) ? stars.map((s) => (isInt(s) && s >= 0 && s <= 3 ? s : 0)) : [],
      }
    },
  },
)

/** A level was won: the next one becomes the current level; the best stars are kept. */
export function recordLevelWin(level: number, stars: number): void {
  const list = [...levelProgress.value.stars]
  while (list.length < level) list.push(0)
  list[level - 1] = Math.max(list[level - 1] ?? 0, stars)
  levelProgress.value = { level: Math.max(levelProgress.value.level, level + 1), stars: list }
}

/** Sum of the best stars of all levels. */
export const totalStars = (): number => levelProgress.value.stars.reduce((sum, s) => sum + s, 0)

/** Speed of the best time score (the score itself is in the statistics). */
export const bestTimeSpeed = usePersistentRef<{ speed: Speed | null }>(
  'bubbles:records:v1',
  { speed: null },
  {
    parse: (raw) => {
      if (typeof raw !== 'object' || raw === null) return undefined
      const speed = (raw as { speed?: unknown }).speed
      return { speed: isSpeed(speed) ? speed : null }
    },
  },
)

export function recordBestSpeed(speed: Speed): void {
  bestTimeSpeed.value = { speed }
}
