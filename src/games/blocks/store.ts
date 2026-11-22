/** Persistence of the running Blocks game (`blocks:current:v1`, saved after the first move). */
import { load, remove, save } from '@/core/storage'

import { SAVE_KEY } from './index'
import { parseRun, type BlocksRun } from './logic/engine'

export function loadRun(): BlocksRun | null {
  return load<BlocksRun | null>(SAVE_KEY, null, (raw) => {
    const run = parseRun(raw)
    return run && !run.over ? run : undefined
  })
}

export function saveRun(run: BlocksRun): void {
  save(SAVE_KEY, run)
}

export function clearRun(): void {
  remove(SAVE_KEY)
}
