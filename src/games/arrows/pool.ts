import { createPuzzlePool } from '@/core/pool'
import { createWorkerClient } from '@/core/worker'

import type { GenerateRequest } from './logic/generator'
import { isArrowsPuzzle, type ArrowsPuzzle, type Difficulty } from './logic/types'

const generate = createWorkerClient<GenerateRequest, ArrowsPuzzle>(
  () => new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' }),
  () => import('./logic/generator').then((module) => module.handleGenerateRequest),
)

/** One prefetched puzzle per difficulty, stored under `riddles:arrows:pool:v1`. */
export const arrowsPool = createPuzzlePool<Difficulty, ArrowsPuzzle>({
  key: 'arrows:pool:v1',
  generate: (difficulty, seed) => generate({ difficulty, seed }),
  isValid: isArrowsPuzzle,
})
