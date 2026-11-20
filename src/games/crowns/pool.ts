import { createPuzzlePool } from '@/core/pool'
import { createWorkerClient } from '@/core/worker'

import type { GenerateRequest } from './logic/generator'
import { isCrownsPuzzle, type CrownsPuzzle, type Difficulty } from './logic/types'

const generate = createWorkerClient<GenerateRequest, CrownsPuzzle>(
  () => new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' }),
  () => import('./logic/generator').then((module) => module.handleGenerateRequest),
)

/** One prefetched puzzle per difficulty, stored under `riddles:crowns:pool:v1`. */
export const crownsPool = createPuzzlePool<Difficulty, CrownsPuzzle>({
  key: 'crowns:pool:v1',
  generate: (difficulty, seed) => generate({ difficulty, seed }),
  isValid: isCrownsPuzzle,
})
