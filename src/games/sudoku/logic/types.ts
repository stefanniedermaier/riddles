/** Core Sudoku types. Framework-free – also used inside the generator worker. */
import type { GridSize } from './board'

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/** Difficulties offered for the 6×6 mini grid. */
export const MINI_DIFFICULTIES = ['easy', 'medium', 'hard'] as const satisfies readonly Difficulty[]

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value)
}

/** `classic` = 9×9 with 3×3 boxes, `mini` = 6×6 with 2×3 boxes. */
export const MODES = ['classic', 'mini'] as const
export type SudokuMode = (typeof MODES)[number]

export function isMode(value: unknown): value is SudokuMode {
  return value === 'classic' || value === 'mini'
}

export const sizeOfMode = (mode: SudokuMode): GridSize => (mode === 'mini' ? 6 : 9)

export function difficultiesOf(mode: SudokuMode): readonly Difficulty[] {
  return mode === 'mini' ? MINI_DIFFICULTIES : DIFFICULTIES
}

/** Statistics variant: classic keeps the plain difficulty, mini uses `mini-<difficulty>`. */
export function statVariant(mode: SudokuMode, difficulty: Difficulty): string {
  return mode === 'mini' ? `mini-${difficulty}` : difficulty
}

/** Cells in row-major order (81 for classic, 36 for mini), 0 = empty. */
export type Grid = number[]

export const TECHNIQUE_IDS = [
  'nakedSingle',
  'hiddenSingle',
  'pointing',
  'claiming',
  'nakedPair',
  'hiddenPair',
  'nakedTriple',
  'hiddenTriple',
  'xWing',
  'xyWing',
  'swordfish',
] as const
export type TechniqueId = (typeof TECHNIQUE_IDS)[number]

export interface SudokuPuzzle {
  seed: number
  difficulty: Difficulty
  /** Clues (0 = empty). */
  givens: Grid
  solution: Grid
  /** Grader score: sum of the technique weights needed to solve the puzzle. */
  score: number
  /** Hardest technique level (1–4) needed to solve the puzzle. */
  hardestLevel: number
  hardestTechnique: TechniqueId
}

/** Mode of a puzzle, derived from its number of cells. */
export function modeOfPuzzle(puzzle: SudokuPuzzle): SudokuMode {
  return puzzle.givens.length === 36 ? 'mini' : 'classic'
}

/** One undoable action: the previous state of every cell it changed. */
export interface UndoStep {
  /** [cell, previous value, previous notes] */
  changes: [number, number, number][]
  /** Selection before the action. */
  selected: number | null
}

/** Running game, stored under `sudoku:current:v1` (classic) or `sudoku:mini:current:v1`. */
export interface SudokuSave {
  puzzle: SudokuPuzzle
  /** Player entries, givens included. */
  values: Grid
  /** Candidate notes per cell, bitmask (bit d = candidate d). */
  notes: number[]
  elapsedMs: number
  hintsUsed: number
  selected: number | null
  /** Undo stack, oldest first (missing in saves of older versions). */
  history?: UndoStep[]
}

export interface Unit {
  kind: 'row' | 'col' | 'box'
  /** 0-based index. */
  index: number
}

export interface CellDigit {
  cell: number
  digit: number
}

/** One logical deduction, used for grading and for hints. */
export interface Step {
  technique: TechniqueId
  placements: CellDigit[]
  eliminations: CellDigit[]
  /** Cells that justify the step (highlighted in hints). */
  focusCells: number[]
  /** Digits the step is about. For XY-Wing: [a, b, c] (pivot a/b, eliminated c). */
  digits: number[]
  /** Units the step happens in (fish: base lines). */
  units: Unit[]
  /** Units where eliminations happen (pointing/claiming: the other unit, fish: cover lines). */
  coverUnits: Unit[]
}

function isGrid(value: unknown, length: number, max: number): value is Grid {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every((v) => Number.isInteger(v) && v >= 0 && v <= max)
  )
}

export function isSudokuPuzzle(value: unknown): value is SudokuPuzzle {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Partial<SudokuPuzzle>
  const length = Array.isArray(p.givens) ? p.givens.length : 0
  if (length !== 81 && length !== 36) return false
  const size = length === 81 ? 9 : 6
  return (
    typeof p.seed === 'number' &&
    isDifficulty(p.difficulty) &&
    isGrid(p.givens, length, size) &&
    isGrid(p.solution, length, size) &&
    p.solution.every((v) => v >= 1) &&
    typeof p.score === 'number' &&
    typeof p.hardestLevel === 'number' &&
    (TECHNIQUE_IDS as readonly string[]).includes(p.hardestTechnique as string)
  )
}

function isUndoStep(value: unknown, length: number): value is UndoStep {
  if (typeof value !== 'object' || value === null) return false
  const step = value as Partial<UndoStep>
  return (
    Array.isArray(step.changes) &&
    step.changes.every(
      (change) =>
        Array.isArray(change) &&
        change.length === 3 &&
        change.every((v) => Number.isInteger(v) && v >= 0) &&
        change[0]! < length,
    ) &&
    (step.selected === null || (Number.isInteger(step.selected) && step.selected! < length))
  )
}

export function isSudokuSave(value: unknown): value is SudokuSave {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<SudokuSave>
  if (!isSudokuPuzzle(s.puzzle)) return false
  const length = s.puzzle.givens.length
  const size = length === 81 ? 9 : 6
  return (
    isGrid(s.values, length, size) &&
    isGrid(s.notes, length, 0x3fe) &&
    typeof s.elapsedMs === 'number' &&
    typeof s.hintsUsed === 'number' &&
    (s.selected === null ||
      (Number.isInteger(s.selected) && s.selected! >= 0 && s.selected! < length)) &&
    (s.history === undefined ||
      (Array.isArray(s.history) && s.history.every((step) => isUndoStep(step, length))))
  )
}
