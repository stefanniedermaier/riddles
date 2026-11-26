/**
 * Persistence of Snake runs and records.
 *
 * - `snake:current:<variant>:v1` – the running game of a mode (saved after the first step)
 * - `snake:records:v1`           – the speed each mode's best score was reached with
 */
import { load, remove, save, usePersistentRef } from '@/core/storage'

import { saveKey, VARIANTS, type Variant } from './index'
import { parseRun, type SnakeRun } from './logic/engine'
import { isSpeed, type Speed } from './logic/types'

export function loadRun(variant: Variant): SnakeRun | null {
  return load<SnakeRun | null>(saveKey(variant), null, (raw) => parseRun(raw, variant))
}

export function saveRun(run: SnakeRun): void {
  save(saveKey(run.variant), run)
}

export function clearRun(variant: Variant): void {
  remove(saveKey(variant))
}

export type BestSpeeds = Record<Variant, Speed | null>

/** Speed of the best score per mode (the score itself is in the statistics). */
export const bestSpeeds = usePersistentRef<BestSpeeds>(
  'snake:records:v1',
  { classic: null, open: null, maze: null },
  {
    parse: (raw) => {
      if (typeof raw !== 'object' || raw === null) return undefined
      const result: BestSpeeds = { classic: null, open: null, maze: null }
      for (const variant of VARIANTS) {
        const value = (raw as Partial<BestSpeeds>)[variant]
        if (isSpeed(value)) result[variant] = value
      }
      return result
    },
  },
)

export function recordBestSpeed(variant: Variant, speed: Speed): void {
  bestSpeeds.value = { ...bestSpeeds.value, [variant]: speed }
}
