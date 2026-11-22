import { parseHistory, type UndoStep } from './history'

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/** Grid sizes per difficulty (Medium picks one of the two at random). */
export const SIZES: Record<Difficulty, readonly number[]> = {
  easy: [6],
  medium: [7, 8],
  hard: [9],
  expert: [10],
}

export const EMPTY = 0
export const MARK = 1
export const CROWN = 2
/** 0 = empty, 1 = marked (✕), 2 = crown. */
export type CellState = typeof EMPTY | typeof MARK | typeof CROWN

export interface CrownsPuzzle {
  seed: number
  difficulty: Difficulty
  size: number
  /** Region index per cell (row-major, length size²), regions numbered in reading order. */
  regions: number[]
  /** `solution[row]` = column of the crown in that row. */
  solution: number[]
  /** Hardest logic level (1–4) the grader needed. */
  hardestLevel: number
}

export interface CrownsSave {
  puzzle: CrownsPuzzle
  cells: CellState[]
  elapsedMs: number
  hintsUsed: number
  /** Undo history (optional for saves written before undo existed). */
  undo?: UndoStep[]
  /** Mistakes found by "Check" (optional for older saves). */
  mistakes?: number
  /** Wrong cells found by the last "Check" (highlighted while they are still wrong). */
  checked?: number[]
}

function isIntArray(value: unknown, length: number, max: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((v) => Number.isInteger(v) && v >= 0 && v < max)
  )
}

export function isCrownsPuzzle(value: unknown): value is CrownsPuzzle {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Partial<CrownsPuzzle>
  return (
    typeof p.seed === 'number' &&
    DIFFICULTIES.includes(p.difficulty as Difficulty) &&
    typeof p.size === 'number' &&
    p.size >= 4 &&
    p.size <= 12 &&
    isIntArray(p.regions, p.size * p.size, p.size) &&
    isIntArray(p.solution, p.size, p.size) &&
    typeof p.hardestLevel === 'number'
  )
}

export function isCrownsSave(value: unknown): value is CrownsSave {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<CrownsSave>
  return (
    isCrownsPuzzle(s.puzzle) &&
    isIntArray(s.cells, s.puzzle.size * s.puzzle.size, 3) &&
    typeof s.elapsedMs === 'number' &&
    typeof s.hintsUsed === 'number' &&
    (s.mistakes === undefined || typeof s.mistakes === 'number') &&
    (s.checked === undefined || (Array.isArray(s.checked) && s.checked.every(Number.isInteger))) &&
    (s.undo === undefined || parseHistory(s.undo, s.puzzle.size * s.puzzle.size) !== undefined)
  )
}
