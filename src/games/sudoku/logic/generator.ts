/**
 * Puzzle generator.
 *
 * 1. Fill a random complete grid.
 * 2. Remove clues in random symmetric pairs; keep a removal only if the puzzle stays unique
 *    and solvable by logic with techniques up to the target level.
 * 3. Accept the puzzle if its hardest required technique equals the target level,
 *    otherwise retry with a derived seed.
 *
 * Everything is deterministic for a given seed (the retry budget is counted in attempts).
 */
import { createRng, hashSeed, type Rng } from '@/core/rng'

import { gradePuzzle, type Grade } from './grader'
import { countSolutions, generateSolvedGrid } from './solver'
import type { Difficulty, Grid, SudokuPuzzle } from './types'

interface Profile {
  /** Technique level the puzzle must require. */
  level: number
  /** Digging stops once the clue count is ≤ a random value in this range and the level is hit. */
  stopAt: [number, number]
  /** Never go below this number of clues. */
  floor: number
  /** Accept only puzzles with at most this many clues. */
  maxGivens: number
  /** Number of grids to try before using the best candidate found. */
  maxAttempts: number
}

export const PROFILES: Record<Difficulty, Profile> = {
  easy: { level: 1, stopAt: [36, 42], floor: 36, maxGivens: 45, maxAttempts: 10 },
  medium: { level: 2, stopAt: [30, 35], floor: 27, maxGivens: 36, maxAttempts: 60 },
  hard: { level: 3, stopAt: [26, 31], floor: 23, maxGivens: 32, maxAttempts: 80 },
  expert: { level: 4, stopAt: [22, 28], floor: 17, maxGivens: 30, maxAttempts: 250 },
}

/** Cell pairs with 180° rotational symmetry (the centre cell stands alone). */
const SYMMETRIC_PAIRS: readonly number[][] = Array.from({ length: 41 }, (_, i) =>
  i === 40 ? [40] : [i, 80 - i],
)

interface Candidate {
  givens: Grid
  solution: Grid
  grade: Grade
  clues: number
}

function dig(solution: Grid, profile: Profile, rng: Rng): Candidate {
  const givens = solution.slice()
  let clues = 81
  let grade: Grade = { solved: true, hardestLevel: 0, hardestTechnique: 'nakedSingle', score: 0, steps: 0 }
  const stopAt = rng.range(profile.stopAt[0], profile.stopAt[1])
  const pairs = rng.shuffle(SYMMETRIC_PAIRS.map((pair) => [...pair]))

  for (const pair of pairs) {
    if (clues - pair.length < profile.floor) continue
    for (const cell of pair) givens[cell] = 0
    // Uniqueness is implied by a successful logical solve, but the exact check is much
    // cheaper and rejects most bad removals early.
    if (countSolutions(givens, 2) === 1) {
      const next = gradePuzzle(givens, profile.level)
      if (next.solved) {
        clues -= pair.length
        grade = next
        if (clues <= stopAt && grade.hardestLevel === profile.level) break
        continue
      }
    }
    for (const cell of pair) givens[cell] = solution[cell]!
  }
  return { givens, solution, grade, clues }
}

function isAccepted(candidate: Candidate, profile: Profile): boolean {
  return candidate.grade.hardestLevel === profile.level && candidate.clues <= profile.maxGivens
}

/** Higher is better: closeness to the target level first, then fewer clues. */
function rank(candidate: Candidate, profile: Profile): number {
  const levelDistance = Math.abs(profile.level - candidate.grade.hardestLevel)
  return -levelDistance * 100 - candidate.clues
}

export interface GenerateOptions {
  /** Override the attempt budget (tests). */
  maxAttempts?: number
  /** Safety net against pathological cases; may break determinism when hit. */
  timeBudgetMs?: number
}

export function generatePuzzle(
  difficulty: Difficulty,
  seed: number,
  options: GenerateOptions = {},
): SudokuPuzzle {
  const profile = PROFILES[difficulty]
  const maxAttempts = options.maxAttempts ?? profile.maxAttempts
  const deadline = performance.now() + (options.timeBudgetMs ?? 15_000)

  let best: Candidate | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createRng(hashSeed(seed, attempt))
    const candidate = dig(generateSolvedGrid(rng), profile, rng)
    if (isAccepted(candidate, profile)) {
      best = candidate
      break
    }
    if (!best || rank(candidate, profile) > rank(best, profile)) best = candidate
    if (performance.now() > deadline) break
  }

  const result = best!
  return {
    seed,
    difficulty,
    givens: result.givens,
    solution: result.solution,
    score: result.grade.score,
    hardestLevel: result.grade.hardestLevel,
    hardestTechnique: result.grade.hardestTechnique,
  }
}

export interface GenerateRequest {
  difficulty: Difficulty
  seed: number
}

/** Worker / fallback entry point. */
export function handleGenerateRequest(request: GenerateRequest): SudokuPuzzle {
  return generatePuzzle(request.difficulty, request.seed)
}
