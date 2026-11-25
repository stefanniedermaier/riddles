import { isInt } from '@/core/guards'

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export interface BoardSize {
  width: number
  height: number
  mines: number
}

/** Board (portrait, at most 12 columns so cells stay tappable) and mine count per difficulty. */
export const SIZES: Record<Difficulty, BoardSize> = {
  easy: { width: 8, height: 10, mines: 12 },
  medium: { width: 9, height: 13, mines: 22 },
  hard: { width: 10, height: 16, mines: 35 },
  expert: { width: 12, height: 18, mines: 50 },
}

/**
 * Logic techniques, from easy to hard (used by the solver, the hints and the grading):
 * 1 single number, 2 two overlapping numbers, 3 trying all arrangements of a group of
 * numbers, 4 counting the mines left.
 */
export type Technique = 1 | 2 | 3 | 4

export interface MinesPuzzle {
  seed: number
  difficulty: Difficulty
  width: number
  height: number
  /** Mine cells (index = row * width + col), sorted. */
  mines: number[]
  /** A cell without adjacent mines; it and its flood fill are revealed at the start. */
  start: number
  /** How often each technique 1–4 was needed to solve the board (grading). */
  grade: [number, number, number, number]
}

export const COVERED = 0
export const REVEALED = 1
export const FLAGGED = 2
export type CellState = typeof COVERED | typeof REVEALED | typeof FLAGGED

export interface MinesSave {
  puzzle: MinesPuzzle
  cells: CellState[]
  /** Moves in this attempt (the game is saved only once this is > 0). */
  actions: number
  elapsedMs: number
  hintsUsed: number
  /** Undone mine hits and wrong flags (found by "Check" or shown instantly). */
  mistakes: number
  /** Wrong flags found by the last "Check" (shown until they are removed). */
  checked?: number[]
  /** The mine that was hit – set while the "mine hit" dialog is open. */
  hit?: number
  /** Board before the fatal move (restored by "Undo move"). */
  before?: CellState[]
}

function isDifficulty(value: unknown): value is Difficulty {
  return (DIFFICULTIES as readonly unknown[]).includes(value)
}


const isCellList = (value: unknown, size: number): value is number[] =>
  Array.isArray(value) && value.every((cell) => isInt(cell) && cell >= 0 && cell < size)

export function isMinesPuzzle(value: unknown): value is MinesPuzzle {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Partial<MinesPuzzle>
  if (!isInt(p.seed) || !isDifficulty(p.difficulty)) return false
  if (!isInt(p.width) || !isInt(p.height) || p.width < 2 || p.height < 2 || p.width * p.height > 1000) return false
  const total = p.width * p.height
  if (!isCellList(p.mines, total) || p.mines.length === 0 || p.mines.length >= total) return false
  if (new Set(p.mines).size !== p.mines.length) return false
  if (!isInt(p.start) || p.start < 0 || p.start >= total || p.mines.includes(p.start)) return false
  return Array.isArray(p.grade) && p.grade.length === 4 && p.grade.every((n) => isInt(n) && n >= 0)
}

export function isMinesSave(value: unknown): value is MinesSave {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<MinesSave>
  if (!isMinesPuzzle(s.puzzle)) return false
  const total = s.puzzle.width * s.puzzle.height
  const isCells = (cells: unknown): cells is CellState[] =>
    Array.isArray(cells) && cells.length === total && cells.every((c) => c === 0 || c === 1 || c === 2)
  if (!isCells(s.cells)) return false
  if (s.checked !== undefined && !isCellList(s.checked, total)) return false
  if (s.hit !== undefined && (!isInt(s.hit) || !s.puzzle.mines.includes(s.hit) || !isCells(s.before))) {
    return false
  }
  return (
    isInt(s.actions) &&
    s.actions >= 0 &&
    typeof s.elapsedMs === 'number' &&
    s.elapsedMs >= 0 &&
    isInt(s.hintsUsed) &&
    s.hintsUsed >= 0 &&
    isInt(s.mistakes) &&
    s.mistakes >= 0
  )
}
