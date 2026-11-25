/**
 * Crowns puzzle generator.
 *
 * 1. Place the solution crowns: a random permutation with no touching neighbours.
 * 2. Grow one contiguous region around every crown.
 * 3. Repair until the puzzle has exactly one solution.
 * 4. Grade with the logical solver and accept if the level fits the difficulty.
 *
 * Deterministic per seed: all randomness comes from the seeded RNG and the number of
 * attempts is bounded (no wall-clock time budget).
 */
import { neighbors4 } from '@/core/grid'
import { createRng, hashSeed, type Rng } from '@/core/rng'

import { createGeometry } from './geometry'
import { solveLogically } from './logic'
import { countSolutions } from './solver'
import { SIZES, type CrownsPuzzle, type Difficulty } from './types'

export interface GenerateRequest {
  difficulty: Difficulty
  seed: number
}

/** Accepted hardest logic level per difficulty. */
export const LEVEL_WINDOW: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 1, max: 2 },
  medium: { min: 2, max: 3 },
  hard: { min: 3, max: 4 },
  expert: { min: 4, max: 4 },
}

export interface GenerateOptions {
  /** Upper bound on candidate puzzles tried before the best one so far is returned. */
  maxAttempts?: number
  /** Override the grid size (tests). */
  size?: number
}

const DEFAULT_MAX_ATTEMPTS = 400
const REPAIR_ITERATIONS = 80

// ---------------------------------------------------------------------------
// Step 1: crowns

/** Column per row such that no two crowns share a column or touch diagonally. */
function placeCrowns(size: number, rng: Rng): number[] {
  const cols = new Array<number>(size).fill(-1)
  const used = new Array<boolean>(size).fill(false)

  function place(row: number): boolean {
    if (row === size) return true
    const order = rng.shuffle(Array.from({ length: size }, (_, i) => i))
    for (const c of order) {
      if (used[c]) continue
      if (row > 0 && Math.abs(c - cols[row - 1]!) <= 1) continue
      cols[row] = c
      used[c] = true
      if (place(row + 1)) return true
      used[c] = false
    }
    return false
  }

  if (!place(0)) throw new Error(`No crown placement for size ${size}`)
  return cols
}

// ---------------------------------------------------------------------------
// Step 2: regions

/**
 * Grows one region per crown by repeatedly adding a random unassigned neighbour cell.
 * Each region gets a random "appetite", which yields a healthy mix of small and large
 * regions; a slight preference for continuing in a straight line creates snake shapes.
 */
function growRegions(size: number, solution: readonly number[], rng: Rng): number[] {
  const total = size * size
  const regions = new Array<number>(total).fill(-1)
  const sizes = new Array<number>(size).fill(1)
  const appetite = Array.from({ length: size }, () => 0.25 + rng.next() * 1.5)
  const lastAdded: number[] = []

  solution.forEach((col, row) => {
    const cell = row * size + col
    regions[cell] = row
    lastAdded[row] = cell
  })

  let assigned = size
  while (assigned < total) {
    // Pick a region, weighted by appetite / size.
    const weights = appetite.map((a, k) => a / sizes[k]!)
    const frontiers: number[][] = []
    let totalWeight = 0
    for (let k = 0; k < size; k++) {
      const frontier = new Set<number>()
      for (let cell = 0; cell < total; cell++) {
        if (regions[cell] !== k) continue
        for (const n of neighbors4(size, cell)) if (regions[n] === -1) frontier.add(n)
      }
      frontiers.push([...frontier])
      if (frontier.size === 0) weights[k] = 0
      totalWeight += weights[k]!
    }
    if (totalWeight === 0) break // cannot happen on a connected grid

    let roll = rng.next() * totalWeight
    let k = 0
    for (; k < size - 1; k++) {
      roll -= weights[k]!
      if (roll < 0) break
    }
    while (frontiers[k]!.length === 0) k = (k + 1) % size

    const frontier = frontiers[k]!
    // Prefer cells adjacent to the last added cell (straight-ish growth) half of the time.
    const last = lastAdded[k]!
    const near = frontier.filter((cell) => neighbors4(size, last).includes(cell))
    const cell = near.length > 0 && rng.chance(0.5) ? rng.pick(near) : rng.pick(frontier)
    regions[cell] = k
    sizes[k]! += 1
    lastAdded[k] = cell
    assigned++
  }
  return regions
}

// ---------------------------------------------------------------------------
// Step 3: uniqueness repair

function regionStaysConnected(
  size: number,
  regions: readonly number[],
  region: number,
  without: number,
  seedCell: number,
): boolean {
  const total = size * size
  let count = 0
  for (let cell = 0; cell < total; cell++) if (regions[cell] === region && cell !== without) count++
  const seen = new Set<number>([seedCell])
  const queue = [seedCell]
  while (queue.length > 0) {
    const cell = queue.pop()!
    for (const n of neighbors4(size, cell)) {
      if (n === without || seen.has(n) || regions[n] !== region) continue
      seen.add(n)
      queue.push(n)
    }
  }
  return seen.size === count
}

/**
 * Moves cells between regions until only the intended solution remains.
 * Returns `null` if it does not converge.
 */
function repairUniqueness(
  size: number,
  regions: number[],
  solution: readonly number[],
  rng: Rng,
): number[] | null {
  const seedOf = (region: number) => region * size + solution[region]!
  for (let iteration = 0; iteration < REPAIR_ITERATIONS; iteration++) {
    const { count, solutions } = countSolutions(size, regions, 2)
    if (count === 1) return regions
    const alternative = solutions.find((s) => s.some((col, row) => col !== solution[row]))
    if (!alternative) return null

    // Crown cells of the alternative that are not crowns of the intended solution.
    const cells = rng.shuffle(
      alternative
        .map((col, row) => (col !== solution[row] ? row * size + col : -1))
        .filter((cell) => cell >= 0),
    )

    let moved = false
    for (const cell of cells) {
      const from = regions[cell]!
      // Region ids equal the row of their seed crown (before renumbering).
      if (!regionStaysConnected(size, regions, from, cell, seedOf(from))) continue
      const targets = rng.shuffle(
        [...new Set(neighbors4(size, cell).map((n) => regions[n]!))].filter((r) => r !== from),
      )
      if (targets.length === 0) continue
      regions[cell] = targets[0]!
      moved = true
      break
    }
    if (!moved) return null
  }
  return null
}

// ---------------------------------------------------------------------------
// Step 4: putting it together

/** Renumbers regions in reading order (first cell of each region decides). */
function renumberRegions(regions: readonly number[]): number[] {
  const mapping = new Map<number, number>()
  return regions.map((region) => {
    if (!mapping.has(region)) mapping.set(region, mapping.size)
    return mapping.get(region)!
  })
}

function distanceToWindow(level: number, difficulty: Difficulty): number {
  const { min, max } = LEVEL_WINDOW[difficulty]
  if (level < min) return min - level
  if (level > max) return level - max
  return 0
}

export function generatePuzzle(
  difficulty: Difficulty,
  seed: number,
  options: GenerateOptions = {},
): CrownsPuzzle {
  const rng = createRng(hashSeed('crowns', seed))
  const size = options.size ?? rng.pick(SIZES[difficulty])
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS

  let best: CrownsPuzzle | null = null
  let bestDistance = Infinity

  for (let attempt = 0; attempt < maxAttempts || best === null; attempt++) {
    const solution = placeCrowns(size, rng)
    const grown = growRegions(size, solution, rng)
    const repaired = repairUniqueness(size, grown, solution, rng)
    if (!repaired) continue

    const regions = renumberRegions(repaired)
    const grade = solveLogically(createGeometry(size, regions))
    if (!grade.solved) continue

    const distance = distanceToWindow(grade.hardestLevel, difficulty)
    if (distance < bestDistance) {
      best = { seed, difficulty, size, regions, solution, hardestLevel: grade.hardestLevel }
      bestDistance = distance
      if (distance === 0) break
    }
    if (attempt > maxAttempts * 20) break // safety net, practically unreachable
  }
  if (!best) throw new Error('Crowns generation failed')
  return best
}

/** Worker / fallback entry point. */
export function handleGenerateRequest(request: GenerateRequest): CrownsPuzzle {
  return generatePuzzle(request.difficulty, request.seed)
}
