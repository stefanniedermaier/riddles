import { exposeWorker } from '@/core/worker'

import { handleGenerateRequest, type GenerateRequest } from './logic/generator'
import type { MinesPuzzle } from './logic/types'

exposeWorker<GenerateRequest, MinesPuzzle>(handleGenerateRequest)
