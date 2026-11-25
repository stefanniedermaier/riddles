import { cardHandler } from '@/core/cards/worker'

import { rules } from './rules'

/** Worker requests: solvable deals and hint solutions. */
// Draw 1 with one pass is almost never winnable (the solver proves most deals unsolvable), so
// those deals are not checked.
export const handle = cardHandler(rules, {
  budget: 100_000,
  attempts: (variant) => (variant === 'draw1-1pass' ? 1 : 40),
})
