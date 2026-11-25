import { isInt } from '@/core/guards'

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/** Board size (columns × rows) per difficulty – at most 10 columns for phones. */
export const SIZES: Record<Difficulty, { width: number; height: number }> = {
  easy: { width: 5, height: 5 },
  medium: { width: 7, height: 7 },
  hard: { width: 8, height: 10 },
  expert: { width: 7, height: 8 },
}

/** Number of sources (separate networks) per difficulty. */
export const SOURCE_COUNT: Record<Difficulty, number> = { easy: 1, medium: 1, hard: 1, expert: 3 }

/** Pipe ends as bits: up, right, down, left. */
export const UP = 1
export const RIGHT = 2
export const DOWN = 4
export const LEFT = 8
export const DIRECTIONS = [UP, RIGHT, DOWN, LEFT] as const

export interface PipesPuzzle {
  seed: number
  difficulty: Difficulty
  width: number
  height: number
  /** The cell holding the (first) source. */
  source: number
  /** All sources when there are several (first = `source`); absent: only `source`. */
  sources?: number[]
  /** Pipe ends per cell in the generated solution (bit mask, see `UP` …). */
  solution: number[]
  /** Clockwise quarter turns per cell at the start (relative to the solution). */
  scramble: number[]
}

export interface PipesSave {
  puzzle: PipesPuzzle
  /** Current clockwise quarter turns per cell (0–3), relative to the solution. */
  turns: number[]
  locked: number[]
  moves: number
  elapsedMs: number
  hintsUsed: number
  /** Cells turned clockwise, newest last (undo turns them back). */
  undo: number[]
}

/** All sources of a puzzle. */
export const sourcesOf = (puzzle: PipesPuzzle): number[] => puzzle.sources ?? [puzzle.source]

function isDifficulty(value: unknown): value is Difficulty {
  return (DIFFICULTIES as readonly unknown[]).includes(value)
}

const inRange = (value: unknown, max: number): value is number => isInt(value) && value >= 0 && value < max

export function isPipesPuzzle(value: unknown): value is PipesPuzzle {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Partial<PipesPuzzle>
  if (!isInt(p.seed) || !isDifficulty(p.difficulty) || !isInt(p.width) || !isInt(p.height)) return false
  if (p.width < 2 || p.height < 2 || p.width * p.height > 400) return false
  const total = p.width * p.height
  if (p.width !== SIZES[p.difficulty].width || p.height !== SIZES[p.difficulty].height) return false
  if (
    p.sources !== undefined &&
    !(
      Array.isArray(p.sources) &&
      p.sources.length >= 1 &&
      p.sources.length <= 4 &&
      p.sources[0] === p.source &&
      p.sources.every((cell) => inRange(cell, total)) &&
      new Set(p.sources).size === p.sources.length
    )
  )
    return false
  return (
    inRange(p.source, total) &&
    Array.isArray(p.solution) &&
    p.solution.length === total &&
    p.solution.every((mask) => isInt(mask) && mask > 0 && mask < 16) &&
    Array.isArray(p.scramble) &&
    p.scramble.length === total &&
    p.scramble.every((turn) => inRange(turn, 4))
  )
}

export function isPipesSave(value: unknown): value is PipesSave {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<PipesSave>
  if (!isPipesPuzzle(s.puzzle)) return false
  const total = s.puzzle.width * s.puzzle.height
  return (
    Array.isArray(s.turns) &&
    s.turns.length === total &&
    s.turns.every((turn) => inRange(turn, 4)) &&
    Array.isArray(s.locked) &&
    s.locked.every((cell) => inRange(cell, total)) &&
    Array.isArray(s.undo) &&
    s.undo.every((cell) => inRange(cell, total)) &&
    isInt(s.moves) &&
    s.moves >= 0 &&
    typeof s.elapsedMs === 'number' &&
    s.elapsedMs >= 0 &&
    isInt(s.hintsUsed) &&
    s.hintsUsed >= 0
  )
}
