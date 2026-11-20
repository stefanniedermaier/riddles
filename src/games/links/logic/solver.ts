/**
 * Exact solver for Links (Numberlink with full coverage).
 *
 * Every colour grows from both of its dots ("heads"); the two heads meet to connect the
 * colour. At each search node the head with the fewest possible moves is extended (forced
 * moves first). Pruning:
 * - a free cell must still be able to become the interior of some path,
 * - the two heads of every unfinished colour must touch or share a free region,
 * - every free region must be reachable by both heads of at least one unfinished colour.
 */
import { neighbors } from './grid'
import type { Endpoint } from './types'

export interface SolveOptions {
  /** Stop after this many solutions (2 = uniqueness check). */
  limit?: number
  /** Abort after this many search nodes. */
  maxNodes?: number
}

export interface SolveResult {
  count: number
  /** Found solutions: one path (a → b) per colour. */
  solutions: number[][][]
  /** `true` if the node budget ran out before the search space was exhausted. */
  aborted: boolean
  nodes: number
}

export function solve(
  size: number,
  endpoints: readonly Endpoint[],
  options: SolveOptions = {},
): SolveResult {
  const limit = options.limit ?? 2
  const maxNodes = options.maxNodes ?? 400_000
  const n = size * size
  const nbs = neighbors(size)
  const k = endpoints.length

  const owner = new Int16Array(n).fill(-1)
  // heads[2c] grows from a, heads[2c + 1] from b.
  const heads = new Int32Array(2 * k)
  const done = new Uint8Array(k)
  const trails: number[][] = []
  for (const e of endpoints) {
    owner[e.a] = e.color
    owner[e.b] = e.color
    heads[2 * e.color] = e.a
    heads[2 * e.color + 1] = e.b
    trails[2 * e.color] = [e.a]
    trails[2 * e.color + 1] = [e.b]
  }

  /** Colour whose head is at a cell (+1), 0 if none – only for unfinished colours. */
  const headOf = new Int16Array(n)
  const label = new Int32Array(n)
  const queue = new Int32Array(n)
  const usable = new Uint8Array(n + 1)

  const solutions: number[][][] = []
  let nodes = 0
  let aborted = false

  function consistent(): boolean {
    headOf.fill(0)
    for (let c = 0; c < k; c++) {
      if (done[c]) continue
      headOf[heads[2 * c]!] = c + 1
      headOf[heads[2 * c + 1]!] = c + 1
    }
    // A free cell needs two neighbours its path can use.
    for (let x = 0; x < n; x++) {
      if (owner[x] !== -1) continue
      let free = 0
      let live = 0
      let pair = false
      const around = nbs[x]!
      for (let i = 0; i < around.length; i++) {
        const y = around[i]!
        if (owner[y] === -1) {
          free++
        } else if (headOf[y]) {
          live++
          // Both heads of one colour next to x: x can join them.
          for (let j = 0; j < i; j++) if (headOf[around[j]!] === headOf[y]) pair = true
        }
      }
      if (free >= 2) continue
      if (free === 1 && live >= 1) continue
      if (free === 0 && pair) continue
      return false
    }
    // Free regions.
    label.fill(0)
    let regions = 0
    for (let x = 0; x < n; x++) {
      if (owner[x] !== -1 || label[x]) continue
      regions++
      let qh = 0
      let qt = 0
      queue[qt++] = x
      label[x] = regions
      while (qh < qt) {
        const y = queue[qh++]!
        for (const z of nbs[y]!) {
          if (owner[z] === -1 && !label[z]) {
            label[z] = regions
            queue[qt++] = z
          }
        }
      }
    }
    usable.fill(0, 0, regions + 1)
    for (let c = 0; c < k; c++) {
      if (done[c]) continue
      const h = heads[2 * c]!
      const t = heads[2 * c + 1]!
      let ok = false
      for (const y of nbs[h]!) {
        if (y === t) ok = true
        const l = label[y]!
        if (!l) continue
        for (const z of nbs[t]!) {
          if (label[z] === l) {
            usable[l] = 1
            ok = true
          }
        }
      }
      if (!ok) return false
    }
    for (let l = 1; l <= regions; l++) if (!usable[l]) return false
    return true
  }

  function search(): void {
    if (solutions.length >= limit || aborted) return
    if (++nodes > maxNodes) {
      aborted = true
      return
    }
    // Head with the fewest moves.
    let best = -1
    let bestCount = 5
    for (let s = 0; s < 2 * k; s++) {
      const c = s >> 1
      if (done[c]) continue
      const other = heads[s ^ 1]!
      let count = 0
      for (const y of nbs[heads[s]!]!) if (owner[y] === -1 || y === other) count++
      if (count === 0) return
      if (count < bestCount) {
        bestCount = count
        best = s
        if (count === 1) break
      }
    }
    if (best === -1) {
      for (let x = 0; x < n; x++) if (owner[x] === -1) return
      solutions.push(
        Array.from({ length: k }, (_, c) => trails[2 * c]!.concat(trails[2 * c + 1]!.slice().reverse())),
      )
      return
    }
    if (!consistent()) return

    const s = best
    const c = s >> 1
    const h = heads[s]!
    const other = heads[s ^ 1]!
    for (const y of nbs[h]!) {
      if (y === other) {
        done[c] = 1
        search()
        done[c] = 0
      } else if (owner[y] === -1) {
        owner[y] = c
        heads[s] = y
        trails[s]!.push(y)
        search()
        trails[s]!.pop()
        heads[s] = h
        owner[y] = -1
      }
      if (solutions.length >= limit || aborted) return
    }
  }

  search()
  return { count: solutions.length, solutions, aborted, nodes }
}
