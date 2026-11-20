/** Core Sudoku types. Framework-free – also used inside the generator worker. */

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value)
}

/** 81 cells, index = row * 9 + col, 0 = empty. */
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

/** Running game, stored under `sudoku:current:v1`. */
export interface SudokuSave {
  puzzle: SudokuPuzzle
  /** Player entries, givens included. */
  values: Grid
  /** Candidate notes per cell, bitmask (bit d = candidate d). */
  notes: number[]
  elapsedMs: number
  hintsUsed: number
  selected: number | null
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

function isGrid(value: unknown, max: number): value is Grid {
  return (
    Array.isArray(value) &&
    value.length === 81 &&
    value.every((v) => Number.isInteger(v) && v >= 0 && v <= max)
  )
}

export function isSudokuPuzzle(value: unknown): value is SudokuPuzzle {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Partial<SudokuPuzzle>
  return (
    typeof p.seed === 'number' &&
    isDifficulty(p.difficulty) &&
    isGrid(p.givens, 9) &&
    isGrid(p.solution, 9) &&
    p.solution.every((v) => v >= 1) &&
    typeof p.score === 'number' &&
    typeof p.hardestLevel === 'number' &&
    (TECHNIQUE_IDS as readonly string[]).includes(p.hardestTechnique as string)
  )
}

export function isSudokuSave(value: unknown): value is SudokuSave {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<SudokuSave>
  return (
    isSudokuPuzzle(s.puzzle) &&
    isGrid(s.values, 9) &&
    isGrid(s.notes, 0x3fe) &&
    typeof s.elapsedMs === 'number' &&
    typeof s.hintsUsed === 'number' &&
    (s.selected === null || (Number.isInteger(s.selected) && s.selected! >= 0 && s.selected! < 81))
  )
}
