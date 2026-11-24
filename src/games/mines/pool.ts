import { createPuzzlePool } from '@/core/pool'
import { createWorkerClient } from '@/core/worker'

import type { GenerateRequest } from './logic/generator'
import { isMinesPuzzle, type Difficulty, type MinesPuzzle } from './logic/types'

const generate = createWorkerClient<GenerateRequest, MinesPuzzle>(
  () => new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' }),
  () => import('./logic/generator').then((module) => module.handleGenerateRequest),
)

/** One prefetched puzzle per difficulty, stored under `riddles:mines:pool:v1`. */
export const minesPool = createPuzzlePool<Difficulty, MinesPuzzle>({
  key: 'mines:pool:v1',
  generate: (difficulty, seed) => generate({ difficulty, seed }),
  isValid: isMinesPuzzle,
})
