import { exposeWorker } from '@/core/worker'

import { handleGenerateRequest, type GenerateRequest } from './logic/generator'
import type { NonogramPuzzle } from './logic/types'

exposeWorker<GenerateRequest, NonogramPuzzle>(handleGenerateRequest)
