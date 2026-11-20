import { createPuzzlePool } from '@/core/pool'
import { createWorkerClient } from '@/core/worker'

import type { GenerateRequest } from './logic/generator'
import { isLinksPuzzle, type Difficulty, type LinksPuzzle } from './logic/types'

const generate = createWorkerClient<GenerateRequest, LinksPuzzle>(
  () => new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' }),
  () => import('./logic/generator').then((module) => module.handleGenerateRequest),
)

/** One prefetched puzzle per difficulty, stored under `riddles:links:pool:v1`. */
export const linksPool = createPuzzlePool<Difficulty, LinksPuzzle>({
  key: 'links:pool:v1',
  generate: (difficulty, seed) => generate({ difficulty, seed }),
  isValid: isLinksPuzzle,
})
