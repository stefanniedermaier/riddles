import type { CardRequest, CardResponse } from '@/core/cards/worker'
import { exposeWorker } from '@/core/worker'

import { handle } from './logic/handler'

exposeWorker<CardRequest, CardResponse>(handle)
