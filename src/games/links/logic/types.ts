export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/** Grid size per difficulty. */
export const SIZES: Record<Difficulty, number> = { easy: 5, medium: 7, hard: 9, expert: 11 }

/** Inclusive range of colour (pair) counts per difficulty. */
export const COLOR_RANGE: Record<Difficulty, readonly [number, number]> = {
  easy: [4, 5],
  medium: [6, 7],
  hard: [7, 9],
  expert: [10, 12],
}

/** The two dots of one colour. `color` equals the index in `LinksPuzzle.endpoints`. */
export interface Endpoint {
  color: number
  a: number
  b: number
}

export interface LinksPuzzle {
  seed: number
  difficulty: Difficulty
  size: number
  endpoints: Endpoint[]
  /** Solution path per colour, from `a` to `b` (cell index = row * size + col). */
  solution: number[][]
}

/** One undo step: the paths before the change. */
export type UndoStep = number[][]

export interface LinksSave {
  puzzle: LinksPuzzle
  /** Player path per colour: empty, or a chain of adjacent cells starting at an endpoint. */
  paths: number[][]
  elapsedMs: number
  hintsUsed: number
  /** Strokes on a different colour than the previous stroke. */
  moves: number
  lastColor: number | null
  undo: UndoStep[]
}

export function isDifficulty(value: unknown): value is Difficulty {
  return (DIFFICULTIES as readonly unknown[]).includes(value)
}

function isCellList(value: unknown, cells: number): value is number[] {
  return Array.isArray(value) && value.every((v) => Number.isInteger(v) && v >= 0 && v < cells)
}

function isPathList(value: unknown, colors: number, cells: number): value is number[][] {
  return Array.isArray(value) && value.length === colors && value.every((p) => isCellList(p, cells))
}

export function isLinksPuzzle(value: unknown): value is LinksPuzzle {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Partial<LinksPuzzle>
  if (!isDifficulty(p.difficulty) || typeof p.seed !== 'number') return false
  if (typeof p.size !== 'number' || p.size !== SIZES[p.difficulty]) return false
  const cells = p.size * p.size
  if (!Array.isArray(p.endpoints) || p.endpoints.length < 2) return false
  const endpointsOk = p.endpoints.every(
    (e, i) =>
      typeof e === 'object' &&
      e !== null &&
      e.color === i &&
      isCellList([e.a, e.b], cells) &&
      e.a !== e.b,
  )
  return endpointsOk && isPathList(p.solution, p.endpoints.length, cells)
}

export function isLinksSave(value: unknown): value is LinksSave {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<LinksSave>
  if (!isLinksPuzzle(s.puzzle)) return false
  const colors = s.puzzle.endpoints.length
  const cells = s.puzzle.size * s.puzzle.size
  return (
    isPathList(s.paths, colors, cells) &&
    typeof s.elapsedMs === 'number' &&
    typeof s.hintsUsed === 'number' &&
    typeof s.moves === 'number' &&
    (s.lastColor === null || (Number.isInteger(s.lastColor) && (s.lastColor as number) < colors)) &&
    Array.isArray(s.undo) &&
    s.undo.every((step) => isPathList(step, colors, cells))
  )
}
