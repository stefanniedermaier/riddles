import { createPuzzlePool } from '@/core/pool'
import { createWorkerClient } from '@/core/worker'

import type { GenerateRequest } from './logic/generator'
import { isNonogramPuzzle, type Difficulty, type NonogramPuzzle } from './logic/types'

const generate = createWorkerClient<GenerateRequest, NonogramPuzzle>(
  () => new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' }),
  () => import('./logic/generator').then((module) => module.handleGenerateRequest),
)

/** One prefetched puzzle per difficulty, stored under `riddles:nonogram:pool:v1`. */
export const nonogramPool = createPuzzlePool<Difficulty, NonogramPuzzle>({
  key: 'nonogram:pool:v1',
  generate: (difficulty, seed) => generate({ difficulty, seed }),
  isValid: isNonogramPuzzle,
})
