import { exposeWorker } from '@/core/worker'

import { handleGenerateRequest, type GenerateRequest } from './logic/generator'
import type { SudokuPuzzle } from './logic/types'

exposeWorker<GenerateRequest, SudokuPuzzle>(handleGenerateRequest)
