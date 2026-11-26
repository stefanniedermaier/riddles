/**
 * Snake engine – pure and deterministic.
 *
 * The snake moves one cell per `step`; the player turns it by 90° (a turn back into itself is
 * ignored). Food makes it one segment longer and appears again on a random free cell. The
 * run ends when the head hits the snake's own body, a wall (classic, maze) or a stone (maze);
 * in the open mode the snake leaves the board on one side and comes back on the other. A
 * full board – no cell left for food – is a win. The random state is part of the run, so a
 * reloaded game continues exactly as it would have.
 */
import { isInt } from '@/core/guards'
import { createRng } from '@/core/rng'

import { MAZE_COUNT, MAZE_SIZE, mazeCells } from './mazes'
import {
  DIRECTIONS,
  OPPOSITE,
  isSpeed,
  type Direction,
  type Speed,
  type Variant,
} from './types'

const SIZES: Record<Variant, number> = { classic: 15, open: 15, maze: MAZE_SIZE }

/** Length of the snake at the start. */
export const START_LENGTH = 3

/** Step interval at the start and at the fastest, and how much faster per food (ms). */
const TIMING: Record<Exclude<Speed, 'calm'>, { start: number; min: number; perFood: number }> = {
  slow: { start: 260, min: 180, perFood: 4 },
  normal: { start: 180, min: 110, perFood: 4 },
  fast: { start: 120, min: 75, perFood: 3 },
}

/** Points per food: faster play pays off. */
const POINTS: Record<Speed, number> = { slow: 1, normal: 2, fast: 3, calm: 1 }

export interface SnakeRun {
  variant: Variant
  size: number
  /** Fixed for the whole run. */
  speed: Speed
  /** Maze layout (`mazes.ts`), -1 without stones. */
  layout: number
  /** Cells (row * size + col), head first. */
  body: number[]
  direction: Direction
  /** Cell of the food, -1 when the board is full. */
  food: number
  score: number
  /** Food eaten. */
  eaten: number
  steps: number
  /** State of the seeded RNG (see core/rng). */
  rngState: number
  over: boolean
  /** The snake fills the whole board. */
  won: boolean
}

export interface StepResult {
  run: SnakeRun
  ate: boolean
  died: boolean
  /** The tail cell given up in this step (`null` when the snake grew or did not move). */
  leftTail: number | null
}

export function pointsPerFood(speed: Speed): number {
  return POINTS[speed]
}

const EMPTY: readonly number[] = []

/** Stones of a run (empty outside the maze mode). */
export function obstaclesOf(run: Pick<SnakeRun, 'layout'>): readonly number[] {
  return run.layout < 0 ? EMPTY : mazeCells(run.layout)
}

/** Places food on a random free cell (one draw); -1 when no cell is free. */
function placeFood(
  size: number,
  taken: ReadonlySet<number>,
  rngState: number,
): { food: number; rngState: number } {
  const free: number[] = []
  for (let cell = 0; cell < size * size; cell++) if (!taken.has(cell)) free.push(cell)
  if (free.length === 0) return { food: -1, rngState }
  const rng = createRng(rngState)
  const food = rng.pick(free)
  return { food, rngState: rng.getState() }
}

export function newRun(variant: Variant, speed: Speed, seed: number): SnakeRun {
  const size = SIZES[variant]
  const rng = createRng(seed)
  const layout = variant === 'maze' ? rng.int(MAZE_COUNT) : -1
  const middle = Math.floor(size / 2)
  const head = middle * size + middle
  const body = Array.from({ length: START_LENGTH }, (_, i) => head - i)
  const taken = new Set([...body, ...obstaclesOf({ layout })])
  const { food, rngState } = placeFood(size, taken, rng.getState())
  return {
    variant,
    size,
    speed,
    layout,
    body,
    direction: 'right',
    food,
    score: 0,
    eaten: 0,
    steps: 0,
    rngState,
    over: false,
    won: false,
  }
}

const DELTA: Record<Direction, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
}

/** The cell next to `cell` in `direction`; -1 outside the board (wraps when `wrap`). */
export function neighbour(cell: number, direction: Direction, size: number, wrap: boolean): number {
  const [dr, dc] = DELTA[direction]
  let row = Math.floor(cell / size) + dr
  let col = (cell % size) + dc
  if (wrap) {
    row = (row + size) % size
    col = (col + size) % size
  } else if (row < 0 || row >= size || col < 0 || col >= size) {
    return -1
  }
  return row * size + col
}

/** Whether `turn` changes the direction (not the same, not back into the snake). */
export function isTurn(direction: Direction, turn: Direction): boolean {
  return turn !== direction && turn !== OPPOSITE[direction]
}

/**
 * One step: applies `turn` (if it is a valid turn), moves the head, grows or moves the tail,
 * places new food. A run that is over does not change.
 */
export function step(run: SnakeRun, turn?: Direction): StepResult {
  if (run.over) return { run, ate: false, died: false, leftTail: null }
  const direction = turn && isTurn(run.direction, turn) ? turn : run.direction
  const head = neighbour(run.body[0]!, direction, run.size, run.variant === 'open')
  const ate = head === run.food
  // The tail moves on in the same step unless the snake grows, so its cell is free.
  const staying = ate ? run.body : run.body.slice(0, -1)
  const hit = head < 0 || obstaclesOf(run).includes(head) || staying.includes(head)
  if (hit) {
    return { run: { ...run, direction, over: true }, ate: false, died: true, leftTail: null }
  }
  const body = [head, ...staying]
  const next: SnakeRun = { ...run, body, direction, steps: run.steps + 1 }
  if (ate) {
    next.score = run.score + POINTS[run.speed]
    next.eaten = run.eaten + 1
    const placed = placeFood(run.size, new Set([...body, ...obstaclesOf(run)]), run.rngState)
    next.food = placed.food
    next.rngState = placed.rngState
    if (placed.food < 0) {
      next.won = true
      next.over = true
    }
  }
  return { run: next, ate, died: false, leftTail: ate ? null : run.body[run.body.length - 1]! }
}

/** Time between two steps for the run's speed and the food eaten so far (0 in calm mode). */
export function stepInterval(run: Pick<SnakeRun, 'speed' | 'eaten'>): number {
  if (run.speed === 'calm') return 0
  const { start, min, perFood } = TIMING[run.speed]
  return Math.max(min, start - run.eaten * perFood)
}

/** Whether two cells are next to each other (across the border when `wrap`). */
export function adjacent(a: number, b: number, size: number, wrap: boolean): boolean {
  return DIRECTIONS.some((direction) => neighbour(a, direction, size, wrap) === b)
}

/** Validates a stored run; `undefined` if it is not a well-formed run of `variant`. */
export function parseRun(raw: unknown, variant: Variant): SnakeRun | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const r = raw as Partial<SnakeRun>
  const size = SIZES[variant]
  if (r.variant !== variant || r.size !== size || !isSpeed(r.speed)) return undefined
  if (![r.layout, r.food, r.score, r.eaten, r.steps, r.rngState].every(isInt)) return undefined
  if (variant === 'maze' ? r.layout! < 0 || r.layout! >= MAZE_COUNT : r.layout !== -1) return undefined
  if (!DIRECTIONS.includes(r.direction as Direction)) return undefined
  if (typeof r.over !== 'boolean' || typeof r.won !== 'boolean' || r.over) return undefined
  if (!Array.isArray(r.body) || r.body.length < START_LENGTH) return undefined
  const stones = new Set(obstaclesOf({ layout: r.layout! }))
  const cells = new Set<number>()
  const wrap = variant === 'open'
  for (const [i, cell] of (r.body as unknown[]).entries()) {
    if (!isInt(cell) || cell < 0 || cell >= size * size || cells.has(cell) || stones.has(cell)) return undefined
    if (i > 0 && !adjacent(r.body[i - 1]!, cell, size, wrap)) return undefined
    cells.add(cell)
  }
  if (r.food! < -1 || r.food! >= size * size || cells.has(r.food!) || stones.has(r.food!)) return undefined
  return r as SnakeRun
}
