/**
 * Persistence of Merge runs and records.
 *
 * - `merge:current:<variant>:v1` – the running game of a variant (saved after the first move)
 * - `merge:records:v1`           – highest tile ever reached per variant
 */
import { load, remove, save, usePersistentRef } from '@/core/storage'

import { saveKey, VARIANTS, type Variant } from './index'
import { parseRun, type MergeRun } from './logic/engine'

export function loadRun(variant: Variant): MergeRun | null {
  return load<MergeRun | null>(saveKey(variant), null, (raw) => parseRun(raw, variant))
}

export function saveRun(run: MergeRun): void {
  save(saveKey(run.variant), run)
}

export function clearRun(variant: Variant): void {
  remove(saveKey(variant))
}

export type Records = Record<Variant, number>

export const records = usePersistentRef<Records>(
  'merge:records:v1',
  { small: 0, classic: 0, large: 0 },
  {
    parse: (raw) => {
      if (typeof raw !== 'object' || raw === null) return undefined
      const result: Records = { small: 0, classic: 0, large: 0 }
      for (const variant of VARIANTS) {
        const value = (raw as Partial<Records>)[variant]
        if (Number.isInteger(value) && (value as number) > 0) result[variant] = value as number
      }
      return result
    },
  },
)

/** Stores the highest tile of a variant; returns `true` for a new record. */
export function recordHighestTile(variant: Variant, value: number): boolean {
  if (value <= records.value[variant]) return false
  const isNew = records.value[variant] > 0
  records.value = { ...records.value, [variant]: value }
  return isNew
}
