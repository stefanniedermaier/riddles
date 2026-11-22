export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/**
 * Grid size per difficulty (columns × rows). Expert is portrait (15 × 20): 20 columns plus
 * clues do not fit a 360 px wide phone screen with usable cell sizes.
 */
export const SIZES: Record<Difficulty, { width: number; height: number }> = {
  easy: { width: 5, height: 5 },
  medium: { width: 10, height: 10 },
  hard: { width: 15, height: 15 },
  expert: { width: 15, height: 20 },
}

/** Inclusive range of the share of filled cells per difficulty. */
export const DENSITY: Record<Difficulty, readonly [number, number]> = {
  easy: [0.52, 0.68],
  medium: [0.48, 0.62],
  hard: [0.45, 0.58],
  expert: [0.45, 0.58],
}

/** Player marks. */
export const UNKNOWN = 0
export const FILLED = 1
export const CROSSED = 2
export type CellMark = typeof UNKNOWN | typeof FILLED | typeof CROSSED

export type Tool = 'fill' | 'cross'

export interface NonogramPuzzle {
  seed: number
  difficulty: Difficulty
  width: number
  height: number
  /** Row-major, 1 = filled. */
  solution: (0 | 1)[]
  rowClues: number[][]
  colClues: number[][]
  /** Propagation passes the line solver needed (rough difficulty measure). */
  passes: number
}

export interface CellChange {
  cell: number
  /** Mark before the step. */
  from: CellMark
}

/** One undo step: the changed cells with their previous marks. */
export type UndoStep = CellChange[]

export interface NonogramSave {
  puzzle: NonogramPuzzle
  cells: CellMark[]
  elapsedMs: number
  hintsUsed: number
  /** Wrong marks counted (right away in instant mode, otherwise by "Check"). */
  mistakes: number
  /** Wrong cells found by the last "Check" (highlighted while they are still wrong). */
  checked?: number[]
  undo: UndoStep[]
}

export function isDifficulty(value: unknown): value is Difficulty {
  return (DIFFICULTIES as readonly unknown[]).includes(value)
}

function isClueList(value: unknown, count: number, max: number): value is number[][] {
  return (
    Array.isArray(value) &&
    value.length === count &&
    value.every(
      (clue) =>
        Array.isArray(clue) && clue.every((n) => Number.isInteger(n) && n > 0 && n <= max),
    )
  )
}

export function isNonogramPuzzle(value: unknown): value is NonogramPuzzle {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Partial<NonogramPuzzle>
  if (!isDifficulty(p.difficulty) || typeof p.seed !== 'number' || typeof p.passes !== 'number') {
    return false
  }
  const { width, height } = SIZES[p.difficulty]
  return (
    p.width === width &&
    p.height === height &&
    Array.isArray(p.solution) &&
    p.solution.length === width * height &&
    p.solution.every((v) => v === 0 || v === 1) &&
    isClueList(p.rowClues, height, width) &&
    isClueList(p.colClues, width, height)
  )
}

function isMarkList(value: unknown, length: number): value is CellMark[] {
  return Array.isArray(value) && value.length === length && value.every((v) => v === 0 || v === 1 || v === 2)
}

export function isNonogramSave(value: unknown): value is NonogramSave {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<NonogramSave>
  if (!isNonogramPuzzle(s.puzzle)) return false
  const cells = s.puzzle.width * s.puzzle.height
  return (
    isMarkList(s.cells, cells) &&
    typeof s.elapsedMs === 'number' &&
    typeof s.hintsUsed === 'number' &&
    typeof s.mistakes === 'number' &&
    (s.checked === undefined || (Array.isArray(s.checked) && s.checked.every(Number.isInteger))) &&
    Array.isArray(s.undo) &&
    s.undo.every(
      (step) =>
        Array.isArray(step) &&
        step.every(
          (change) =>
            typeof change === 'object' &&
            change !== null &&
            Number.isInteger(change.cell) &&
            change.cell >= 0 &&
            change.cell < cells &&
            [0, 1, 2].includes(change.from),
        ),
    )
  )
}
