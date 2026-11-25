import { cardHandler } from '@/core/cards/worker'

import { rules } from './rules'

/** Worker requests: solvable deals and hint solutions. */
export const handle = cardHandler(rules, { budget: 60_000, attempts: (variant) => (variant === 'hard' ? 1 : 40) })
