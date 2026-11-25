import { cardHandler } from '@/core/cards/worker'

import { rules } from './rules'

/** Worker requests: solvable deals and hint solutions. */
export const handle = cardHandler(rules, { budget: 100_000, attempts: () => 40 })
