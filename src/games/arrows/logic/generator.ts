/**
 * Arrows generator.
 *
 * The board is built in **reverse removal order**: every new arrow is placed so that its exit
 * ray (head → edge) crosses none of the arrows placed before it. Removing the arrows in the
 * reverse placement order is therefore always possible – every puzzle is solvable by
 * construction. Later arrows may (and usually do) sit on the rays of earlier ones, which
 * creates the dependency chains that make the puzzle interesting.
 */
import { createRng, hashSeed, type Rng } from '@/core/rng'

import { dependencyDepth, rayCells } from './analysis'
import { DELTAS, SIZES, type Arrow, type ArrowsPuzzle, type Difficulty, type Direction } from './types'

export interface DifficultyParams {
  /** Inclusive window for the number of arrows. */
  arrows: readonly [number, number]
  /** Inclusive window for the dependency depth. */
  depth: readonly [number, number]
  /** Longest arrow (cells). */
  maxLength: number
  /** Minimum share of covered cells. */
  coverage: number
}

export const PARAMS: Record<Difficulty, DifficultyParams> = {
  easy: { arrows: [8, 13], depth: [3, 4], maxLength: 4, coverage: 0.8 },
  medium: { arrows: [14, 22], depth: [5, 6], maxLength: 5, coverage: 0.82 },
  hard: { arrows: [22, 32], depth: [7, 9], maxLength: 6, coverage: 0.82 },
  expert: { arrows: [32, 52], depth: [8, 99], maxLength: 6, coverage: 0.8 },
}

/** Candidate boards tried per puzzle before the best one so far is used. */
const MAX_ATTEMPTS = 300

export interface GenerateRequest {
  difficulty: Difficulty
  seed: number
}

function neighbours(size: number, cell: number): number[] {
  const row = Math.floor(cell / size)
  const col = cell % size
  const result: number[] = []
  for (const [dr, dc] of Object.values(DELTAS)) {
    const r = row + dr
    const c = col + dc
    if (r >= 0 && r < size && c >= 0 && c < size) result.push(r * size + c)
  }
  return result
}

/** Random arrow length 1…max, weighted towards 2–4 cells. */
function pickLength(rng: Rng, max: number): number {
  const weights = [1, 4, 5, 4, 2, 1].slice(0, max)
  let roll = rng.next() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]!
    if (roll < 0) return i + 1
  }
  return max
}

/** One candidate board (no grading yet). */
function buildBoard(size: number, params: DifficultyParams, rng: Rng): Arrow[] {
  const occ = new Int32Array(size * size).fill(-1)
  const arrows: Arrow[] = []
  const free = (cell: number) => occ[cell] === -1

  let failures = 0
  while (arrows.length < params.arrows[1] && failures < size * size * 2) {
    const freeCells = [...occ.keys()].filter(free)
    if (freeCells.length === 0) break
    const head = rng.pick(freeCells)
    const dirs = rng.shuffle([0, 1, 2, 3] as Direction[])
    let placed: Arrow | null = null

    for (const dir of dirs) {
      const ray = rayCells(size, head, dir)
      if (!ray.every(free)) continue
      const rayCellsSet = new Set(ray)
      const length = pickLength(rng, params.maxLength)
      const cells = [head]
      // The cell behind the head fixes the direction of the last segment.
      const [dr, dc] = DELTAS[dir]
      const behindRow = Math.floor(head / size) - dr
      const behindCol = (head % size) - dc
      if (length > 1 && behindRow >= 0 && behindRow < size && behindCol >= 0 && behindCol < size) {
        const behind = behindRow * size + behindCol
        if (free(behind)) {
          cells.unshift(behind)
          // Grow the tail as a random walk, preferring tight spots to avoid isolated holes.
          while (cells.length < length) {
            const tail = cells[0]!
            const options = neighbours(size, tail).filter(
              (cell) => free(cell) && !cells.includes(cell) && !rayCellsSet.has(cell),
            )
            if (options.length === 0) break
            const scored = options.map((cell) => ({
              cell,
              score:
                neighbours(size, cell).filter((n) => free(n) && !cells.includes(n)).length +
                rng.next() * 2.5,
            }))
            scored.sort((a, b) => a.score - b.score)
            cells.unshift(scored[0]!.cell)
          }
        }
      }
      if (cells.length === 1 && length > 1 && rng.chance(0.75)) continue // prefer longer arrows
      placed = { id: arrows.length, cells, dir }
      break
    }

    if (!placed) {
      failures++
      continue
    }
    for (const cell of placed.cells) occ[cell] = placed.id
    arrows.push(placed)
  }
  return arrows
}

/** Penalty of a candidate board relative to the difficulty targets (0 = inside all windows). */
function distance(arrows: number, depth: number, coverage: number, params: DifficultyParams): number {
  const outside = (value: number, [lo, hi]: readonly [number, number]) =>
    value < lo ? lo - value : value > hi ? value - hi : 0
  return (
    outside(arrows, params.arrows) * 2 +
    outside(depth, params.depth) * 3 +
    Math.max(0, params.coverage - coverage) * 40
  )
}

export function generatePuzzle(difficulty: Difficulty, seed: number): ArrowsPuzzle {
  const size = SIZES[difficulty]
  const params = PARAMS[difficulty]
  let best: { puzzle: ArrowsPuzzle; distance: number } | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = createRng(hashSeed('arrows', seed, attempt))
    const arrows = buildBoard(size, params, rng)
    // Shuffle ids so the placement order is not visible in the data.
    const order = rng.shuffle(arrows.map((_, index) => index))
    const shuffled = order.map((from, id) => ({ ...arrows[from]!, id }))
    const puzzle: ArrowsPuzzle = { seed, difficulty, size, arrows: shuffled, depth: 0 }
    puzzle.depth = dependencyDepth(puzzle)
    const covered = shuffled.reduce((sum, arrow) => sum + arrow.cells.length, 0) / (size * size)
    const d = distance(shuffled.length, puzzle.depth, covered, params)
    if (!best || d < best.distance) best = { puzzle, distance: d }
    if (d === 0) break
  }
  return best!.puzzle
}

export function handleGenerateRequest(request: GenerateRequest): ArrowsPuzzle {
  return generatePuzzle(request.difficulty, request.seed)
}
