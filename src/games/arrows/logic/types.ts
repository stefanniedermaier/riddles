export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/** Board size (cells per side) per difficulty. */
export const SIZES: Record<Difficulty, number> = { easy: 6, medium: 8, hard: 10, expert: 12 }

/** Lives per attempt. */
export const LIVES = 3

/** 0 = up, 1 = right, 2 = down, 3 = left. */
export type Direction = 0 | 1 | 2 | 3

export interface Arrow {
  /** Index in `ArrowsPuzzle.arrows`. */
  id: number
  /** Cells from tail to head (cell index = row * size + col), orthogonally connected. */
  cells: number[]
  /** Direction the head points to (and the arrow leaves the board in). */
  dir: Direction
}

export interface ArrowsPuzzle {
  seed: number
  difficulty: Difficulty
  size: number
  arrows: Arrow[]
  /** Longest chain "A can only leave after B left" (grading). */
  depth: number
}

export interface ArrowsSave {
  puzzle: ArrowsPuzzle
  /** Ids of arrows that already left the board, in removal order. */
  removed: number[]
  lives: number
  /** Taps in this attempt (the game is saved only once this is > 0). */
  actions: number
  elapsedMs: number
  hintsUsed: number
}

export function isDifficulty(value: unknown): value is Difficulty {
  return (DIFFICULTIES as readonly unknown[]).includes(value)
}

const isInt = (value: unknown): value is number => Number.isInteger(value)

/** Step of a direction on a board of `size`: [dRow, dCol]. */
export const DELTAS: Record<Direction, readonly [number, number]> = {
  0: [-1, 0],
  1: [0, 1],
  2: [1, 0],
  3: [0, -1],
}

/** Direction from cell `a` to the orthogonally adjacent cell `b`, or null. */
export function directionBetween(size: number, a: number, b: number): Direction | null {
  const dr = Math.floor(b / size) - Math.floor(a / size)
  const dc = (b % size) - (a % size)
  for (const dir of [0, 1, 2, 3] as const) {
    if (DELTAS[dir][0] === dr && DELTAS[dir][1] === dc) return dir
  }
  return null
}

export function isArrowsPuzzle(value: unknown): value is ArrowsPuzzle {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Partial<ArrowsPuzzle>
  if (!isInt(p.seed) || !isDifficulty(p.difficulty) || !isInt(p.size) || !isInt(p.depth)) return false
  const size = p.size
  if (size < 2 || size > 20 || !Array.isArray(p.arrows) || p.arrows.length === 0) return false
  const seen = new Set<number>()
  return p.arrows.every((arrow, index) => {
    if (typeof arrow !== 'object' || arrow === null) return false
    const a = arrow as Partial<Arrow>
    if (a.id !== index || ![0, 1, 2, 3].includes(a.dir as number) || !Array.isArray(a.cells)) return false
    if (a.cells.length === 0) return false
    for (let i = 0; i < a.cells.length; i++) {
      const cell = a.cells[i]
      if (!isInt(cell) || cell < 0 || cell >= size * size || seen.has(cell)) return false
      seen.add(cell)
      if (i > 0 && directionBetween(size, a.cells[i - 1]!, cell) === null) return false
    }
    if (a.cells.length > 1) {
      const last = directionBetween(size, a.cells[a.cells.length - 2]!, a.cells[a.cells.length - 1]!)
      if (last !== a.dir) return false
    }
    return true
  })
}

export function isArrowsSave(value: unknown): value is ArrowsSave {
  if (typeof value !== 'object' || value === null) return false
  const s = value as Partial<ArrowsSave>
  if (!isArrowsPuzzle(s.puzzle)) return false
  const count = s.puzzle.arrows.length
  return (
    Array.isArray(s.removed) &&
    s.removed.every((id) => isInt(id) && id >= 0 && id < count) &&
    new Set(s.removed).size === s.removed.length &&
    isInt(s.lives) &&
    s.lives >= 1 &&
    s.lives <= LIVES &&
    isInt(s.actions) &&
    s.actions >= 0 &&
    typeof s.elapsedMs === 'number' &&
    isInt(s.hintsUsed) &&
    s.hintsUsed >= 0
  )
}
