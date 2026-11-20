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

import type { GridSize } from './board'
import { gradePuzzle, type Grade } from './grader'
import { countSolutions, generateSolvedGrid } from './solver'
import { MINI_DIFFICULTIES, type Difficulty, type Grid, type SudokuPuzzle } from './types'

interface Profile {
  /** Hardest technique level allowed while digging; the puzzle must require it … */
  level: number
  /** … unless a lower minimum is given (accepted: minLevel ≤ hardest level ≤ level). */
  minLevel?: number
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

/**
 * Profiles of the 6×6 mini grid (36 cells, clues are removed in symmetric pairs).
 *
 * Practically every 6×6 puzzle falls to singles (measured: ~98 % of maximally dug grids), so
 * the technique level cannot separate difficulties. Mini difficulty is therefore defined by the
 * number of givens: the fewer clues, the longer the chains of singles and the fewer places to
 * start. Every puzzle is still unique and solvable by logic alone.
 * An `expert` request is treated like `hard`.
 */
export const MINI_PROFILES: Record<(typeof MINI_DIFFICULTIES)[number], Profile> = {
  easy: { level: 1, stopAt: [16, 16], floor: 16, maxGivens: 18, maxAttempts: 10 },
  medium: { level: 1, stopAt: [12, 12], floor: 12, maxGivens: 12, maxAttempts: 20 },
  hard: { level: 4, minLevel: 1, stopAt: [8, 10], floor: 8, maxGivens: 10, maxAttempts: 60 },
}

export function profileFor(size: GridSize, difficulty: Difficulty): Profile {
  if (size === 9) return PROFILES[difficulty]
  return MINI_PROFILES[difficulty === 'expert' ? 'hard' : difficulty]
}

/** Cell pairs with 180° rotational symmetry (a centre cell, if any, stands alone). */
function symmetricPairs(cellCount: number): number[][] {
  const pairs: number[][] = []
  for (let i = 0; i < Math.floor(cellCount / 2); i++) pairs.push([i, cellCount - 1 - i])
  if (cellCount % 2 === 1) pairs.push([(cellCount - 1) / 2])
  return pairs
}
const SYMMETRIC_PAIRS: Record<GridSize, readonly number[][]> = {
  9: symmetricPairs(81),
  6: symmetricPairs(36),
}

interface Candidate {
  givens: Grid
  solution: Grid
  grade: Grade
  clues: number
}

function dig(solution: Grid, profile: Profile, rng: Rng): Candidate {
  const givens = solution.slice()
  let clues = solution.length
  let grade: Grade = { solved: true, hardestLevel: 0, hardestTechnique: 'nakedSingle', score: 0, steps: 0 }
  const stopAt = rng.range(profile.stopAt[0], profile.stopAt[1])
  const size: GridSize = solution.length === 36 ? 6 : 9
  const pairs = rng.shuffle(SYMMETRIC_PAIRS[size].map((pair) => [...pair]))

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
        if (clues <= stopAt && grade.hardestLevel >= (profile.minLevel ?? profile.level)) break
        continue
      }
    }
    for (const cell of pair) givens[cell] = solution[cell]!
  }
  return { givens, solution, grade, clues }
}

function levelDistance(candidate: Candidate, profile: Profile): number {
  const level = candidate.grade.hardestLevel
  const min = profile.minLevel ?? profile.level
  return level < min ? min - level : level > profile.level ? level - profile.level : 0
}

function isAccepted(candidate: Candidate, profile: Profile): boolean {
  return levelDistance(candidate, profile) === 0 && candidate.clues <= profile.maxGivens
}

/** Higher is better: closeness to the target level first, then fewer clues. */
function rank(candidate: Candidate, profile: Profile): number {
  return -levelDistance(candidate, profile) * 100 - candidate.clues
}

export interface GenerateOptions {
  /** Grid size: 9 (classic, default) or 6 (mini). */
  size?: GridSize
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
  const size = options.size ?? 9
  const profile = profileFor(size, difficulty)
  const maxAttempts = options.maxAttempts ?? profile.maxAttempts
  const deadline = performance.now() + (options.timeBudgetMs ?? 15_000)

  let best: Candidate | null = null
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createRng(hashSeed(seed, attempt))
    const candidate = dig(generateSolvedGrid(rng, size), profile, rng)
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
    difficulty: size === 6 && difficulty === 'expert' ? 'hard' : difficulty,
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
  /** 9 (default) or 6. */
  size?: GridSize
}

/** Worker / fallback entry point. */
export function handleGenerateRequest(request: GenerateRequest): SudokuPuzzle {
  return generatePuzzle(request.difficulty, request.seed, { size: request.size ?? 9 })
}
