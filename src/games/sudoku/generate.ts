/**
 * Puzzle supply for the UI: generation runs in a Web Worker and one puzzle per difficulty
 * is kept ready in storage, so starting a new game is usually instant.
 */
import { createPuzzlePool } from '@/core/pool'
import { createWorkerClient } from '@/core/worker'

import { POOL_KEY } from './index'
import type { GenerateRequest } from './logic/generator'
import { isSudokuPuzzle, type Difficulty, type SudokuPuzzle } from './logic/types'

const generateInWorker = createWorkerClient<GenerateRequest, SudokuPuzzle>(
  () => new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' }),
  () => import('./logic/generator').then((module) => module.handleGenerateRequest),
)

export const sudokuPool = createPuzzlePool<Difficulty, SudokuPuzzle>({
  key: POOL_KEY,
  generate: (difficulty, seed) => generateInWorker({ difficulty, seed }),
  isValid: isSudokuPuzzle,
})
