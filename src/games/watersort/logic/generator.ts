/**
 * Water Sort generator: shuffles four layers of every colour into the tubes, rejects levels
 * that look half solved and checks that the solver can solve them.
 */
import { createRng, hashSeed } from '@/core/rng'

import { topRun } from './rules'
import { solve } from './solver'
import { CAPACITY, COLORS, EMPTY_TUBES, type Difficulty, type Tubes, type WaterSortPuzzle } from './types'

/** No tube starts sorted and no colour sits three or more layers deep anywhere. */
function looksScrambled(tubes: Tubes): boolean {
  return tubes.every((tube) => {
    for (let i = 2; i < tube.length; i++) if (tube[i] === tube[i - 1] && tube[i] === tube[i - 2]) return false
    return tube.length === 0 || (topRun(tube)?.count ?? 0) < tube.length
  })
}

export function generatePuzzle(difficulty: Difficulty, seed: number): WaterSortPuzzle {
  const colors = COLORS[difficulty]
  for (let attempt = 0; ; attempt++) {
    const rng = createRng(hashSeed('watersort', seed, attempt))
    const layers = rng.shuffle(Array.from({ length: colors * CAPACITY }, (_, i) => i % colors))
    const tubes: Tubes = Array.from({ length: colors }, (_, t) => layers.slice(t * CAPACITY, (t + 1) * CAPACITY))
    for (let i = 0; i < EMPTY_TUBES; i++) tubes.push([])
    if (looksScrambled(tubes) && solve(tubes)) return { seed, difficulty, colors, tubes }
  }
}
