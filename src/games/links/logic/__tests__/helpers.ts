import { areAdjacent } from '../grid'
import type { Endpoint, LinksPuzzle } from '../types'

/** Checks that `paths` connect every colour (a → b), never overlap and cover the grid. */
export function validSolution(size: number, endpoints: readonly Endpoint[], paths: readonly number[][]): string {
  const seen = new Set<number>()
  for (const e of endpoints) {
    const path = paths[e.color]!
    if (path[0] !== e.a || path[path.length - 1] !== e.b) return `colour ${e.color}: wrong ends`
    for (let i = 0; i < path.length; i++) {
      if (seen.has(path[i]!)) return `cell ${path[i]} used twice`
      seen.add(path[i]!)
      if (i > 0 && !areAdjacent(size, path[i - 1]!, path[i]!)) return `colour ${e.color}: gap`
    }
  }
  return seen.size === size * size ? 'ok' : `covers ${seen.size} of ${size * size}`
}

/** Independent brute force: number of full-coverage solutions (colours drawn one after another). */
export function bruteForceCount(size: number, endpoints: readonly Endpoint[], cap = 50): number {
  const n = size * size
  const used = new Uint8Array(n)
  for (const e of endpoints) used[e.a] = used[e.b] = 1
  let count = 0
  const step = (color: number, cell: number, covered: number): void => {
    if (count >= cap) return
    const e = endpoints[color]!
    for (const next of [cell - size, cell + size, cell % size ? cell - 1 : -1, (cell + 1) % size ? cell + 1 : -1]) {
      if (next < 0 || next >= n) continue
      if (next === e.b) {
        if (color + 1 === endpoints.length) {
          if (covered === n) count++
        } else {
          step(color + 1, endpoints[color + 1]!.a, covered)
        }
      } else if (!used[next]) {
        used[next] = 1
        step(color, next, covered + 1)
        used[next] = 0
      }
    }
  }
  step(0, endpoints[0]!.a, endpoints.length * 2)
  return count
}

/**
 * 3×3 test puzzle:      A A A      A: 0 → 2
 *                       B B B      B: 3 → 8
 *                       C C B      C: 6 → 7
 */
export const SMALL: LinksPuzzle = {
  seed: 1,
  difficulty: 'easy',
  size: 3,
  endpoints: [
    { color: 0, a: 0, b: 2 },
    { color: 1, a: 3, b: 8 },
    { color: 2, a: 6, b: 7 },
  ],
  solution: [
    [0, 1, 2],
    [3, 4, 5, 8],
    [6, 7],
  ],
}
