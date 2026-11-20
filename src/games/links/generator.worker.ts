import { exposeWorker } from '@/core/worker'

import { handleGenerateRequest, type GenerateRequest } from './logic/generator'
import type { LinksPuzzle } from './logic/types'

exposeWorker<GenerateRequest, LinksPuzzle>(handleGenerateRequest)
