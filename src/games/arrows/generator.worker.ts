import { exposeWorker } from '@/core/worker'

import { handleGenerateRequest, type GenerateRequest } from './logic/generator'
import type { ArrowsPuzzle } from './logic/types'

exposeWorker<GenerateRequest, ArrowsPuzzle>(handleGenerateRequest)
