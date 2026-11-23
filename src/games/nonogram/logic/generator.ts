/**
 * Nonogram generator.
 *
 * 1. Random structured pattern: seeded noise, smoothed by a few majority (cellular automaton)
 *    rounds into blobs, optionally mirrored for a symmetric look.
 * 2. Keep the fill density within the difficulty's range and avoid many empty lines.
 * 3. Line logic must determine every cell (⇒ exactly one solution, no guessing). While it
 *    doesn't, flip a random undetermined cell of the pattern and try again.
 * 4. Larger difficulties need a minimum number of solver passes (see MIN_PASSES).
 *
 * Deterministic per seed; the attempt count is bounded.
 */
import { createRng, hashSeed, type Rng } from '@/core/rng'

import { cluesFor } from './lines'
import { solveByLines } from './solver'
import { DENSITY, SIZES, type Difficulty, type NonogramPuzzle } from './types'

export interface GenerateRequest {
  difficulty: Difficulty
  seed: number
}

export interface GenerateOptions {
  /** Patterns tried before the best candidate is used. */
  maxAttempts?: number
  /** Cell flips per pattern while repairing ambiguity. */
  maxRepairs?: number
}

const DEFAULT_ATTEMPTS = 60
const DEFAULT_REPAIRS: Record<Difficulty, number> = { easy: 30, medium: 80, hard: 150 }

/**
 * Minimum propagation passes of the line solver: more passes mean deductions build on each
 * other more often, which makes larger grids feel harder. Puzzles below the minimum are only
 * used as a fallback.
 */
export const MIN_PASSES: Record<Difficulty, number> = { easy: 1, medium: 4, hard: 5 }

function randomPattern(width: number, height: number, density: number, rng: Rng): (0 | 1)[] {
  let grid: (0 | 1)[] = Array.from({ length: width * height }, () => (rng.chance(density) ? 1 : 0))
  const rounds = width * height <= 25 ? 1 : rng.range(1, 2)
  for (let round = 0; round < rounds; round++) {
    const next = grid.slice()
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        let filled = 0
        let total = 0
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr
            const cc = c + dc
            if (rr < 0 || cc < 0 || rr >= height || cc >= width) continue
            total++
            filled += grid[rr * width + cc]!
          }
        }
        // Majority with a little randomness keeps edges organic.
        const share = filled / total
        next[r * width + c] = share > 0.5 ? 1 : share < 0.5 ? 0 : rng.chance(0.5) ? 1 : 0
      }
    }
    grid = next
  }
  // Mirror for a symmetric motif now and then.
  if (rng.chance(0.4)) {
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < Math.floor(width / 2); c++) grid[r * width + (width - 1 - c)] = grid[r * width + c]!
    }
  }
  return grid
}

function densityOf(grid: readonly number[]): number {
  return grid.reduce((sum, v) => sum + v, 0) / grid.length
}

/** Too many empty or completely filled lines make dull puzzles. */
function hasStructure(grid: readonly number[], width: number, height: number): boolean {
  const { rowClues, colClues } = cluesFor(grid, width, height)
  const lines = [...rowClues, ...colClues]
  const empty = lines.filter((clue) => clue.length === 0).length
  return empty <= Math.floor(lines.length * 0.1)
}

/** Adjusts the density into range by flipping random cells. */
function fitDensity(grid: (0 | 1)[], [min, max]: readonly [number, number], rng: Rng): void {
  let density = densityOf(grid)
  let guard = grid.length * 4
  while ((density < min || density > max) && guard-- > 0) {
    const cell = rng.int(grid.length)
    if (density < min && grid[cell] === 0) grid[cell] = 1
    else if (density > max && grid[cell] === 1) grid[cell] = 0
    density = densityOf(grid)
  }
}

export function generatePuzzle(
  difficulty: Difficulty,
  seed: number,
  options: GenerateOptions = {},
): NonogramPuzzle {
  const { width, height } = SIZES[difficulty]
  const range = DENSITY[difficulty]
  const maxAttempts = options.maxAttempts ?? DEFAULT_ATTEMPTS
  const maxRepairs = options.maxRepairs ?? DEFAULT_REPAIRS[difficulty]

  let fallback: NonogramPuzzle | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createRng(hashSeed('nonogram', seed, attempt))
    const target = range[0] + rng.next() * (range[1] - range[0])
    const grid = randomPattern(width, height, target, rng)
    fitDensity(grid, range, rng)
    if (!hasStructure(grid, width, height)) continue

    for (let repair = 0; repair <= maxRepairs; repair++) {
      const clues = cluesFor(grid, width, height)
      const result = solveByLines({ width, height, ...clues })
      if (result.solved) {
        const density = densityOf(grid)
        const puzzle: NonogramPuzzle = {
          seed,
          difficulty,
          width,
          height,
          solution: grid.slice(),
          ...clues,
          passes: result.passes,
        }
        const shapeOk =
          density >= range[0] - 0.03 && density <= range[1] + 0.03 && hasStructure(grid, width, height)
        if (shapeOk && result.passes >= MIN_PASSES[difficulty]) return puzzle
        if (shapeOk && (!fallback || puzzle.passes > fallback.passes)) fallback = puzzle
        fallback ??= puzzle
        break
      }
      // Flip an undetermined cell; this removes ambiguity step by step.
      const open: number[] = []
      result.cells.forEach((value, cell) => {
        if (value === -1) open.push(cell)
      })
      const cell = rng.pick(open)
      grid[cell] = grid[cell] === 1 ? 0 : 1
    }
  }
  if (fallback) return fallback
  throw new Error(`no nonogram found for ${difficulty} / ${seed}`)
}

export function handleGenerateRequest(request: GenerateRequest): NonogramPuzzle {
  return generatePuzzle(request.difficulty, request.seed)
}
