export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export interface Params {
  /** Positions in the code. */
  positions: number
  /** Colours to choose from. */
  colors: number
  /** Whether a colour may appear more than once. */
  repeats: boolean
  /** Guesses allowed. */
  guesses: number
}

export const PARAMS: Record<Difficulty, Params> = {
  easy: { positions: 4, colors: 6, repeats: false, guesses: 10 },
  medium: { positions: 4, colors: 6, repeats: true, guesses: 10 },
  hard: { positions: 5, colors: 7, repeats: true, guesses: 10 },
  expert: { positions: 6, colors: 8, repeats: true, guesses: 12 },
}

export interface CodePuzzle {
  seed: number
  difficulty: Difficulty
  code: number[]
}

export interface CodeSave {
  puzzle: CodePuzzle
  /** Submitted guesses, oldest first. */
  guesses: number[][]
  /** The row being entered (null = empty slot). */
  current: (number | null)[]
  elapsedMs: number
  hintsUsed: number
}

function isDifficulty(value: unknown): value is Difficulty {
  return (DIFFICULTIES as readonly unknown[]).includes(value)
}

const isInt = (value: unknown): value is number => Number.isInteger(value)

function isCode(value: unknown, params: Params): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === params.positions &&
    value.every((color) => isInt(color) && color >= 0 && color < params.colors)
  )
}

export function isCodePuzzle(value: unknown): value is CodePuzzle {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Partial<CodePuzzle>
  return isInt(p.seed) && isDifficulty(p.difficulty) && isCode(p.code, PARAMS[p.difficulty])
}

export function isCodeSave(value: unknown): value is CodeSave {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<CodeSave>
  if (!isCodePuzzle(s.puzzle)) return false
  const params = PARAMS[s.puzzle.difficulty]
  return (
    Array.isArray(s.guesses) &&
    s.guesses.length < params.guesses &&
    s.guesses.every((guess) => isCode(guess, params)) &&
    Array.isArray(s.current) &&
    s.current.length === params.positions &&
    s.current.every((color) => color === null || (isInt(color) && color >= 0 && color < params.colors)) &&
    typeof s.elapsedMs === 'number' &&
    s.elapsedMs >= 0 &&
    isInt(s.hintsUsed) &&
    s.hintsUsed >= 0
  )
}
