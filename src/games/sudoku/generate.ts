/**
 * Puzzle supply for the UI: generation runs in a Web Worker and one puzzle per difficulty
 * and mode is kept ready in storage, so starting a new game is usually instant.
 */
import { createPuzzlePool, type PuzzlePool } from '@/core/pool'
import { createWorkerClient } from '@/core/worker'

import { poolKeyOf } from './index'
import type { GenerateRequest } from './logic/generator'
import {
  isSudokuPuzzle,
  modeOfPuzzle,
  sizeOfMode,
  type Difficulty,
  type SudokuMode,
  type SudokuPuzzle,
} from './logic/types'

const generateInWorker = createWorkerClient<GenerateRequest, SudokuPuzzle>(
  () => new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' }),
  () => import('./logic/generator').then((module) => module.handleGenerateRequest),
)

function createPool(mode: SudokuMode): PuzzlePool<Difficulty, SudokuPuzzle> {
  return createPuzzlePool<Difficulty, SudokuPuzzle>({
    key: poolKeyOf(mode),
    generate: (difficulty, seed) => generateInWorker({ difficulty, seed, size: sizeOfMode(mode) }),
    isValid: (puzzle): puzzle is SudokuPuzzle =>
      isSudokuPuzzle(puzzle) && modeOfPuzzle(puzzle) === mode,
  })
}

// A Map (not a plain object): the mode can come from the URL, and Map keys can never touch
// Object.prototype.
const pools = new Map<SudokuMode, PuzzlePool<Difficulty, SudokuPuzzle>>()

/** Puzzle pool of a mode (created lazily). */
export function poolOf(mode: SudokuMode): PuzzlePool<Difficulty, SudokuPuzzle> {
  let pool = pools.get(mode)
  if (!pool) {
    pool = createPool(mode)
    pools.set(mode, pool)
  }
  return pool
}
