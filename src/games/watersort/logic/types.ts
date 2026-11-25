import { isInt } from '@/core/guards'

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/** Layers per tube. */
export const CAPACITY = 4
/** Empty tubes at the start. */
export const EMPTY_TUBES = 2

/** Number of colours per difficulty (one full tube each, plus two empty tubes). */
export const COLORS: Record<Difficulty, number> = { easy: 4, medium: 6, hard: 9, expert: 12 }

/** Tubes, each a list of colours from bottom to top. */
export type Tubes = number[][]

export interface WaterSortPuzzle {
  seed: number
  difficulty: Difficulty
  colors: number
  tubes: Tubes
}

export interface Move {
  from: number
  to: number
}

export interface PouredMove extends Move {
  /** Layers moved. */
  amount: number
}

export interface WaterSortSave {
  puzzle: WaterSortPuzzle
  tubes: Tubes
  /** Moves made, newest last (undo pours them back). */
  history: PouredMove[]
  moves: number
  elapsedMs: number
  hintsUsed: number
}

function isDifficulty(value: unknown): value is Difficulty {
  return (DIFFICULTIES as readonly unknown[]).includes(value)
}


function isTubes(value: unknown, colors: number, count: number): value is Tubes {
  if (!Array.isArray(value) || value.length !== count) return false
  const seen = new Array<number>(colors).fill(0)
  for (const tube of value) {
    if (!Array.isArray(tube) || tube.length > CAPACITY) return false
    for (const color of tube) {
      if (!isInt(color) || color < 0 || color >= colors) return false
      seen[color]! += 1
    }
  }
  return seen.every((n) => n === CAPACITY)
}

export function isWaterSortPuzzle(value: unknown): value is WaterSortPuzzle {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Partial<WaterSortPuzzle>
  if (!isInt(p.seed) || !isDifficulty(p.difficulty) || !isInt(p.colors) || p.colors < 2 || p.colors > 12) {
    return false
  }
  return isTubes(p.tubes, p.colors, p.colors + EMPTY_TUBES)
}

export function isWaterSortSave(value: unknown): value is WaterSortSave {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<WaterSortSave>
  if (!isWaterSortPuzzle(s.puzzle)) return false
  const count = s.puzzle.tubes.length
  const inRange = (n: unknown) => isInt(n) && n >= 0 && n < count
  return (
    isTubes(s.tubes, s.puzzle.colors, count) &&
    Array.isArray(s.history) &&
    s.history.every(
      (m) =>
        typeof m === 'object' &&
        m !== null &&
        inRange(m.from) &&
        inRange(m.to) &&
        isInt(m.amount) &&
        m.amount >= 1 &&
        m.amount <= CAPACITY,
    ) &&
    isInt(s.moves) &&
    s.moves >= 0 &&
    typeof s.elapsedMs === 'number' &&
    s.elapsedMs >= 0 &&
    isInt(s.hintsUsed) &&
    s.hintsUsed >= 0
  )
}
