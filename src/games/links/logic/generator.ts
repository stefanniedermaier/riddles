/**
 * Links puzzle generator.
 *
 * 1. Tile the grid randomly with short paths (dominoes, single cells where needed).
 * 2. Repeatedly merge two paths whose ends touch, as long as the merged path does not touch
 *    itself (no two non-consecutive cells of one path are orthogonal neighbours). Such
 *    "tight" paths make alternative solutions much rarer.
 * 3. Stop at a random colour count of the difficulty's range; every path needs ≥ 3 cells.
 * 4. The exact solver must find exactly one solution (full coverage) within its budget.
 *
 * Deterministic per seed; attempts are bounded, the last candidate is the fallback.
 */
import { createRng, hashSeed, type Rng } from '@/core/rng'

import { neighbors } from './grid'
import { solve } from './solver'
import { COLOR_RANGE, SIZES, type Difficulty, type Endpoint, type LinksPuzzle } from './types'

export interface GenerateRequest {
  difficulty: Difficulty
  seed: number
}

export interface GenerateOptions {
  maxAttempts?: number
  /** Node budget of each uniqueness check. */
  maxNodes?: number
}

const DEFAULT_ATTEMPTS = 200
const DEFAULT_NODES: Record<Difficulty, number> = {
  easy: 20_000,
  medium: 20_000,
  hard: 30_000,
  expert: 30_000,
}

/** Random cover of the grid by paths of one or two cells. */
function randomTiling(size: number, rng: Rng): number[][] {
  const n = size * size
  const nbs = neighbors(size)
  const owner = new Int32Array(n).fill(-1)
  const paths: number[][] = []
  const order = rng.shuffle(Array.from({ length: n }, (_, i) => i))
  for (const cell of order) {
    if (owner[cell] !== -1) continue
    const free = nbs[cell]!.filter((x) => owner[x] === -1)
    if (free.length > 0) {
      const other = rng.pick(free)
      owner[cell] = owner[other] = paths.length
      paths.push([cell, other])
    } else {
      owner[cell] = paths.length
      paths.push([cell])
    }
  }
  return paths
}

/**
 * Reduces the path cover to `target` paths:
 * - **merge**: join two paths whose ends touch, if the result does not touch itself;
 * - **shift** (when no merge is possible): an end of path P takes over the adjacent piece of a
 *   neighbouring path Q (from the touching cell to one end of Q). The number of paths stays
 *   the same, but ends move, which opens up new merges.
 * Returns `null` if the target is not reached within the shift budget.
 */
export function reducePaths(
  size: number,
  initial: number[][],
  target: number,
  rng: Rng,
  maxShifts = 40 * size * size,
): number[][] | null {
  const n = size * size
  const nbs = neighbors(size)
  const paths: (number[] | null)[] = initial.map((p) => p.slice())
  const owner = new Int32Array(n)
  paths.forEach((p, i) => p!.forEach((cell) => (owner[cell] = i)))
  const mark = new Int32Array(n)
  let stamp = 0
  let count = paths.filter(Boolean).length

  const endsOf = (p: readonly number[]) => (p.length === 1 ? [p[0]!] : [p[0]!, p[p.length - 1]!])

  /** Whether `p` (ending at `e`) touches any marked cell other than via the joint e–x. */
  function touchesMarked(p: readonly number[], e: number, x: number): boolean {
    for (const u of p) {
      for (const v of nbs[u]!) {
        if (mark[v] === stamp && !(u === e && v === x)) return true
      }
    }
    return false
  }

  function tryMerge(): boolean {
    const candidates: [number, number, number, number][] = []
    paths.forEach((p, i) => {
      if (!p) return
      for (const e of endsOf(p)) {
        for (const x of nbs[e]!) {
          const j = owner[x]!
          if (j > i && endsOf(paths[j]!).includes(x)) candidates.push([i, e, j, x])
        }
      }
    })
    rng.shuffle(candidates)
    for (const [i, e, j, x] of candidates) {
      const p = paths[i]!
      const q = paths[j]!
      stamp++
      for (const cell of q) mark[cell] = stamp
      if (touchesMarked(p, e, x)) continue
      const left = p[p.length - 1] === e ? p : p.slice().reverse()
      const right = q[0] === x ? q : q.slice().reverse()
      paths[i] = left.concat(right)
      paths[j] = null
      for (const cell of right) owner[cell] = i
      count--
      return true
    }
    return false
  }

  /** Paths with fewer than 3 cells (not allowed in a finished puzzle). */
  const shortPaths = () => paths.flatMap((p, i) => (p && p.length < 3 ? [i] : []))

  function tryShift(only?: readonly number[]): void {
    const alive = only ?? paths.flatMap((p, i) => (p ? [i] : []))
    const i = rng.pick(alive)
    const p = paths[i]!
    const e = rng.pick(endsOf(p))
    const others = nbs[e]!.filter((x) => owner[x] !== i)
    if (others.length === 0) return
    const x = rng.pick(others)
    const j = owner[x]!
    const q = paths[j]!
    const k = q.indexOf(x)
    // Piece taken over (starting at x) and the remainder that stays path j.
    const towardsStart = rng.chance(0.5)
    const piece = towardsStart ? q.slice(0, k + 1).reverse() : q.slice(k)
    const rest = towardsStart ? q.slice(k + 1) : q.slice(0, k)
    if (rest.length === 0) return // that would be a merge
    stamp++
    for (const cell of piece) mark[cell] = stamp
    if (touchesMarked(p, e, x)) return
    const left = p[p.length - 1] === e ? p : p.slice().reverse()
    paths[i] = left.concat(piece)
    paths[j] = rest
    for (const cell of piece) owner[cell] = i
  }

  let shifts = 0
  while (count > target) {
    if (tryMerge()) continue
    if (shifts++ >= maxShifts) return null
    tryShift()
  }
  // Grow paths that are still too short by letting them take over pieces of neighbours.
  for (let short = shortPaths(); short.length > 0; short = shortPaths()) {
    if (shifts++ >= maxShifts) return null
    tryShift(short)
  }
  return paths.filter((p): p is number[] => p !== null)
}

function toPuzzle(difficulty: Difficulty, seed: number, size: number, paths: number[][], rng: Rng): LinksPuzzle {
  // Random colour assignment; each path runs from a to b.
  const order = rng.shuffle(paths.map((_, i) => i))
  const solution = order.map((i) => (rng.chance(0.5) ? paths[i]!.slice() : paths[i]!.slice().reverse()))
  const endpoints: Endpoint[] = solution.map((path, color) => ({
    color,
    a: path[0]!,
    b: path[path.length - 1]!,
  }))
  return { seed, difficulty, size, endpoints, solution }
}

const endpointsOf = (paths: readonly number[][]): Endpoint[] =>
  paths.map((path, color) => ({ color, a: path[0]!, b: path[path.length - 1]! }))

/**
 * Splits one path into two colours to rule out an alternative solution. With a known
 * alternative, a path that differs in it is split at a joint the alternative does not use;
 * without one (search aborted), the longest path is split. Returns `false` if no path is long
 * enough (both parts need ≥ 3 cells).
 */
function splitForUniqueness(paths: number[][], alternative: number[][] | null, rng: Rng): boolean {
  const options: { color: number; index: number }[] = []
  paths.forEach((path, color) => {
    if (path.length < 6) return
    let joints: Set<string> | null = null
    if (alternative) {
      const alt = alternative[color]!
      if (alt.length === path.length && alt.every((cell, i) => cell === path[i])) return
      joints = new Set()
      for (let i = 0; i + 1 < alt.length; i++) {
        joints.add(`${alt[i]}-${alt[i + 1]}`)
        joints.add(`${alt[i + 1]}-${alt[i]}`)
      }
    }
    for (let index = 2; index <= path.length - 4; index++) {
      if (joints?.has(`${path[index]}-${path[index + 1]}`)) continue
      options.push({ color, index })
    }
  })
  if (options.length === 0) return false
  let pick: { color: number; index: number }
  if (alternative) {
    pick = rng.pick(options)
  } else {
    // Longest path, split near its middle.
    const longest = Math.max(...options.map((o) => paths[o.color]!.length))
    const candidates = options.filter((o) => {
      const len = paths[o.color]!.length
      return len === longest && Math.abs(o.index - len / 2) <= len / 4
    })
    pick = rng.pick(candidates.length > 0 ? candidates : options)
  }
  const path = paths[pick.color]!
  paths[pick.color] = path.slice(0, pick.index + 1)
  paths.push(path.slice(pick.index + 1))
  return true
}

export function generatePuzzle(
  difficulty: Difficulty,
  seed: number,
  options: GenerateOptions = {},
): LinksPuzzle {
  const rng = createRng(hashSeed('links', seed))
  const size = SIZES[difficulty]
  const [minColors, maxColors] = COLOR_RANGE[difficulty]
  const maxAttempts = options.maxAttempts ?? DEFAULT_ATTEMPTS
  const maxNodes = options.maxNodes ?? DEFAULT_NODES[difficulty]

  let fallback: number[][] | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Start below the range: splits that enforce uniqueness add colours.
    const start = Math.max(2, minColors - (size >= 9 ? 3 : 1))
    const paths = reducePaths(size, randomTiling(size, rng), rng.range(start, minColors), rng)
    if (!paths) continue
    while (paths.length <= maxColors) {
      const result = solve(size, endpointsOf(paths), { limit: 2, maxNodes })
      if (result.count === 1 && !result.aborted) {
        if (paths.length >= minColors) return toPuzzle(difficulty, seed, size, paths, rng)
        // Unique but too few colours: add one by splitting the longest path.
        if (!splitForUniqueness(paths, null, rng)) break
        continue
      }
      fallback ??= paths.map((p) => p.slice())
      const alternative = result.count >= 2 ? (result.solutions[1] ?? null) : null
      if (!splitForUniqueness(paths, alternative, rng)) break
    }
  }
  if (!fallback) throw new Error(`Links: could not generate a ${difficulty} puzzle`)
  return toPuzzle(difficulty, seed, size, fallback, rng)
}

export function handleGenerateRequest(request: GenerateRequest): LinksPuzzle {
  return generatePuzzle(request.difficulty, request.seed)
}
