import { cardHandler } from '@/core/cards/worker'

import { rules } from './rules'

/** Worker requests: solvable deals and hint solutions. */
export const handle = cardHandler(rules, { budget: 80_000, attempts: (variant) => (variant === 'suits4' ? 4 : 30) })
