import { exposeWorker } from '@/core/worker'

import { handleGenerateRequest, type GenerateRequest } from './logic/generator'
import type { CrownsPuzzle } from './logic/types'

exposeWorker<GenerateRequest, CrownsPuzzle>(handleGenerateRequest)
