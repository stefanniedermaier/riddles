/**
 * Bubbles engine – pure and deterministic.
 *
 * A shot snaps into the field (`trace`); three or more touching bubbles of its colour pop,
 * and every bubble no longer connected to the ceiling falls. A shot that removes nothing is a
 * miss: in the endless mode a few misses push a new row in from the top, in the time mode the
 * ceiling comes down on a clock (`tick`). A bubble below the danger line ends the run. Levels
 * have a goal and a shot limit (`levels.ts`).
 *
 * The random state is part of the run, so a reloaded game continues exactly as it would have.
 */
import { isInt, isNonNegativeInt } from '@/core/guards'
import { createRng, type Rng } from '@/core/rng'

import { CELLS, COLS, isCell, LIMIT, neighbours, rowOf, rowWidth, type Parity, type Point } from './grid'
import { trace } from './trace'
import {
  BOMB,
  COLOR_COUNT,
  EMPTY,
  isColor,
  isShot,
  isSpeed,
  RAINBOW,
  STONE,
  type Shot,
  type Speed,
  type Variant,
} from './types'

// ---------------------------------------------------------------------------
// Rules data

/** Points per popped bubble. */
const POP_POINTS = 10
/** The n-th bubble falling in one shot scores `FALL_POINTS · n`, at most `FALL_CAP`. */
const FALL_POINTS = 20
const FALL_CAP = 400
/** Bonus for an empty field (endless, time). */
export const CLEAR_BONUS = 1000
/** Bonus per unused shot when a level is completed. */
const SHOT_BONUS = 100
/** Every this many hits in a row earn a bomb; this many bubbles removed by one shot a rainbow. */
export const BOMB_COMBO = 8
const RAINBOW_REMOVED = 10

/** Rows at the start, and colours at the start and from `MORE_COLORS_AT` pushed rows on. */
const START_ROWS: Record<Exclude<Variant, 'levels'>, number> = { endless: 6, time: 5 }
const START_COLORS = 5
const MORE_COLORS_AT = 10
/** Endless: stones appear in new rows from this many pushed rows on. */
const STONES_AT = 8
const STONE_CHANCE = 0.04
/** New rows: chance that a bubble takes the colour of a neighbour (clusters). */
const CLUSTER = 0.45

/** Time mode: ms between two ceiling drops at the start and at the fastest, faster per drop. */
const CLOCK: Record<Speed, { start: number; min: number; perRow: number }> = {
  slow: { start: 20_000, min: 14_000, perRow: 400 },
  normal: { start: 14_000, min: 9_000, perRow: 350 },
  fast: { start: 9_000, min: 6_000, perRow: 250 },
}

// ---------------------------------------------------------------------------
// State

export type Goal =
  | { type: 'clear' }
  /** Bring down all marked bubbles (popped or fallen). */
  | { type: 'free'; count: number }
  /** Pop `count` bubbles of one colour. */
  | { type: 'color'; color: number; count: number }
  | { type: 'score'; target: number }

export interface LevelSetup {
  level: number
  seed: number
  colors: number
  cells: readonly number[]
  marked: readonly number[]
  goal: Goal
  /** Shot limit, -1 = unlimited (only used while the generator calibrates a level). */
  shots: number
}

export interface BubblesRun {
  variant: Variant
  /** Level number (levels mode), 0 otherwise. */
  level: number
  /** Speed of the time mode (fixed for the run); `normal` in the other modes. */
  speed: Speed
  /** `ROWS × COLS` cells: `EMPTY`, a colour or `STONE`. */
  cells: number[]
  parity: Parity
  /** Marked cells (level goal "free"). */
  marked: number[]
  current: Shot
  next: Shot
  /** Number of colours new rows and shots use. */
  colors: number
  goal: Goal | null
  /** Progress of the goal: marked bubbles brought down, or bubbles of the goal colour popped. */
  progress: number
  /** Shots left in a level, -1 = no limit. */
  shotsLeft: number
  shots: number
  /** Misses since the last new row (endless). */
  misses: number
  /** Hits in a row. */
  combo: number
  /** Rows pushed in so far (endless, time). */
  rows: number
  /** Time mode: ms counted towards the next ceiling drop. */
  clockMs: number
  score: number
  rngState: number
  over: boolean
  won: boolean
}

interface RemovedBubble {
  cell: number
  value: number
}

export interface ShotResult {
  run: BubblesRun
  /** Flight path of the shot. */
  path: Point[]
  /** Cell the shot snapped into (-1: nothing happened). */
  cell: number
  /** What was fired, and the colour it took (a rainbow takes a colour; a bomb stays `BOMB`). */
  shot: Shot
  placedAs: number
  popped: RemovedBubble[]
  fallen: RemovedBubble[]
  points: number
  /** A new row came in after this shot (endless). */
  pushed: boolean
  /** The field was emptied (and refilled in endless / time). */
  cleared: boolean
  /** A special earned by this shot (now the next bubble). */
  earned: Shot | null
}

// ---------------------------------------------------------------------------
// Field helpers

export const emptyCells = (): number[] => new Array<number>(CELLS).fill(EMPTY)

/** Colours on the field (popable bubbles only). */
export function fieldColors(cells: readonly number[]): number[] {
  const seen = new Set<number>()
  for (const value of cells) if (isColor(value)) seen.add(value)
  return [...seen].sort((a, b) => a - b)
}

const isFieldEmpty = (cells: readonly number[]): boolean => cells.every((value) => value === EMPTY)

/** Lowest occupied row, -1 for an empty field. */
export function lowestRow(cells: readonly number[]): number {
  for (let cell = CELLS - 1; cell >= 0; cell--) if (cells[cell] !== EMPTY) return rowOf(cell)
  return -1
}

/** Cells of the same colour connected to `start`. */
function group(cells: readonly number[], parity: Parity, start: number): number[] {
  const color = cells[start]
  const seen = new Set([start])
  const stack = [start]
  while (stack.length > 0) {
    const cell = stack.pop()!
    for (const n of neighbours(cell, parity)) {
      if (!seen.has(n) && cells[n] === color) {
        seen.add(n)
        stack.push(n)
      }
    }
  }
  return [...seen]
}

/** Bubbles not connected to the ceiling (row 0). */
export function floating(cells: readonly number[], parity: Parity): number[] {
  const held = new Set<number>()
  const stack: number[] = []
  for (let col = 0; col < COLS; col++) {
    if (cells[col] !== EMPTY && isCell(col, parity)) {
      held.add(col)
      stack.push(col)
    }
  }
  while (stack.length > 0) {
    const cell = stack.pop()!
    for (const n of neighbours(cell, parity)) {
      if (!held.has(n) && cells[n] !== EMPTY) {
        held.add(n)
        stack.push(n)
      }
    }
  }
  const result: number[] = []
  for (let cell = 0; cell < CELLS; cell++) if (cells[cell] !== EMPTY && !held.has(cell)) result.push(cell)
  return result
}

/** The colour a rainbow takes next to `cell`: the touching colour with the biggest group. */
export function rainbowColor(cells: readonly number[], parity: Parity, cell: number, fallback: number): number {
  let best = -1
  let bestSize = 0
  for (const n of neighbours(cell, parity)) {
    const value = cells[n]!
    if (!isColor(value)) continue
    const size = group(cells, parity, n).length
    if (size > bestSize || (size === bestSize && value < best)) {
      best = value
      bestSize = size
    }
  }
  return best >= 0 ? best : fallback
}

export interface Placement {
  cells: number[]
  placedAs: number
  popped: RemovedBubble[]
  fallen: RemovedBubble[]
}

/** Puts a shot into a free cell and resolves pops and falls (no randomness involved). */
export function place(cells: readonly number[], parity: Parity, cell: number, shot: Shot): Placement {
  const next = [...cells]
  const popped: RemovedBubble[] = []
  let placedAs = shot
  if (shot === BOMB) {
    // Pops the cell itself and all six around it – stones included.
    for (const n of neighbours(cell, parity)) {
      if (next[n] !== EMPTY) {
        popped.push({ cell: n, value: next[n]! })
        next[n] = EMPTY
      }
    }
  } else {
    placedAs = shot === RAINBOW ? rainbowColor(next, parity, cell, fieldColors(next)[0] ?? 0) : shot
    next[cell] = placedAs
    const same = group(next, parity, cell)
    if (same.length >= 3) {
      for (const c of same) {
        popped.push({ cell: c, value: next[c]! })
        next[c] = EMPTY
      }
    }
  }
  const fallen: RemovedBubble[] = []
  if (popped.length > 0) {
    for (const c of floating(next, parity)) {
      fallen.push({ cell: c, value: next[c]! })
      next[c] = EMPTY
    }
  }
  return { cells: next, placedAs, popped, fallen }
}

/** Points of a shot before the combo multiplier. */
export function basePoints(popped: number, fallen: number): number {
  let points = popped * POP_POINTS
  for (let n = 1; n <= fallen; n++) points += Math.min(FALL_POINTS * n, FALL_CAP)
  return points
}

/** Multiplier for the n-th hit in a row (1, 1.25, 1.5 … at most 3). */
export const comboMultiplier = (combo: number): number => Math.min(3, 1 + 0.25 * Math.max(0, combo - 1))

/** Specials (bomb, rainbow, stones) are part of the endless mode and the levels. */
const hasSpecials = (variant: Variant): boolean => variant !== 'time'

/** Misses before a new row comes in (endless): 5, later 4, then 3. */
export const missLimit = (rows: number): number => (rows < 6 ? 5 : rows < 14 ? 4 : 3)

/** Time mode: ms between two ceiling drops for the run's speed and drops so far. */
export function dropInterval(run: Pick<BubblesRun, 'speed' | 'rows'>): number {
  const clock = CLOCK[run.speed]
  return Math.max(clock.min, clock.start - run.rows * clock.perRow)
}

/** A random colour for a new row cell, often the colour of a neighbour already placed. */
function rowColor(rng: Rng, cells: readonly number[], parity: Parity, cell: number, colors: number): number {
  if (rng.chance(CLUSTER)) {
    const placed = neighbours(cell, parity).filter((n) => n < cell && isColor(cells[n]!))
    if (placed.length > 0) return cells[rng.pick(placed)]!
  }
  return rng.int(colors)
}

/** Fills the top `rows` rows of an empty field. */
export function fillRows(rng: Rng, parity: Parity, rows: number, colors: number): number[] {
  const cells = emptyCells()
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < rowWidth(row, parity); col++) {
      const cell = row * COLS + col
      cells[cell] = rowColor(rng, cells, parity, cell, colors)
    }
  }
  return cells
}

/** A shot colour: one of the colours on the field (all colours of the run on an empty one). */
function drawShot(rng: Rng, cells: readonly number[], colors: number): Shot {
  const present = fieldColors(cells)
  return present.length > 0 ? rng.pick(present) : rng.int(colors)
}

/** Replaces a waiting colour that is no longer on the field. */
function refreshShot(rng: Rng, shot: Shot, cells: readonly number[], colors: number): Shot {
  if (!isColor(shot)) return shot
  const present = fieldColors(cells)
  return present.length === 0 || present.includes(shot) ? shot : drawShot(rng, cells, colors)
}

const reachedLimit = (cells: readonly number[]): boolean => lowestRow(cells) >= LIMIT

// ---------------------------------------------------------------------------
// Runs

export interface RunOptions {
  speed?: Speed
  level?: LevelSetup
}

export function newRun(variant: Variant, seed: number, options: RunOptions = {}): BubblesRun {
  const level = variant === 'levels' ? options.level : undefined
  if (variant === 'levels' && !level) throw new Error('A level run needs its level setup')
  const rng = createRng(level ? level.seed : seed)
  const parity: Parity = 0
  const colors = level ? level.colors : START_COLORS
  const cells = level ? [...level.cells] : fillRows(rng, parity, START_ROWS[variant as 'endless' | 'time'], colors)
  const current = drawShot(rng, cells, colors)
  const next = drawShot(rng, cells, colors)
  return {
    variant,
    level: level?.level ?? 0,
    speed: variant === 'time' ? (options.speed ?? 'normal') : 'normal',
    cells,
    parity,
    marked: level ? [...level.marked] : [],
    current,
    next,
    colors,
    goal: level?.goal ?? null,
    progress: 0,
    shotsLeft: level ? level.shots : -1,
    shots: 0,
    misses: 0,
    combo: 0,
    rows: 0,
    clockMs: 0,
    score: 0,
    rngState: rng.getState(),
    over: false,
    won: false,
  }
}

/** Swaps the current and the next bubble. */
export function swap(run: BubblesRun): BubblesRun {
  if (run.over) return run
  return { ...run, current: run.next, next: run.current }
}

/** Pushes a new row in at the top: everything moves one row down. */
function pushRowWith(run: BubblesRun, rng: Rng): BubblesRun {
  const parity = (1 - run.parity) as Parity
  const rows = run.rows + 1
  const colors = rows >= MORE_COLORS_AT ? Math.max(run.colors, COLOR_COUNT) : run.colors
  const cells = emptyCells()
  for (let cell = 0; cell < CELLS - COLS; cell++) cells[cell + COLS] = run.cells[cell]!
  const stones = hasSpecials(run.variant) && rows >= STONES_AT
  for (let col = 0; col < rowWidth(0, parity); col++) {
    cells[col] = stones && rng.chance(STONE_CHANCE) ? STONE : rowColor(rng, cells, parity, col, colors)
  }
  const marked = run.marked.map((cell) => cell + COLS).filter((cell) => cell < CELLS)
  const over = reachedLimit(cells)
  return { ...run, cells, parity, rows, colors, marked, over: run.over || over, won: false }
}

/** Pushes a new row in (endless after misses, time on the clock). */
export function pushRow(run: BubblesRun): BubblesRun {
  if (run.over) return run
  const rng = createRng(run.rngState)
  const next = pushRowWith(run, rng)
  return { ...next, rngState: rng.getState() }
}

/** Time mode: counts `ms` towards the next ceiling drop; drops a row when it is due. */
export function tick(run: BubblesRun, ms: number): { run: BubblesRun; pushed: boolean } {
  if (run.over || run.variant !== 'time') return { run, pushed: false }
  const clockMs = run.clockMs + Math.max(0, ms)
  const interval = dropInterval(run)
  if (clockMs < interval) return { run: { ...run, clockMs }, pushed: false }
  const pushed = pushRow({ ...run, clockMs: clockMs - interval })
  return { run: pushed, pushed: true }
}

/** Is the level goal reached? */
export function goalReached(run: Pick<BubblesRun, 'goal' | 'progress' | 'cells' | 'score'>): boolean {
  const goal = run.goal
  if (!goal) return false
  switch (goal.type) {
    case 'clear':
      return isFieldEmpty(run.cells)
    case 'free':
    case 'color':
      return run.progress >= goal.count
    case 'score':
      return run.score >= goal.target
  }
}

/** Stars of a completed level: 3 within the par, 2 up to halfway to the limit, else 1. */
export function starsFor(used: number, par: number, limit: number): 1 | 2 | 3 {
  if (used <= par) return 3
  if (used <= par + Math.ceil((limit - par) / 2)) return 2
  return 1
}

const noShot = (run: BubblesRun): ShotResult => ({
  run,
  path: [],
  cell: -1,
  shot: run.current,
  placedAs: run.current,
  popped: [],
  fallen: [],
  points: 0,
  pushed: false,
  cleared: false,
  earned: null,
})

/** Fires the current bubble at `angle` (degrees, 90 = straight up). */
export function shoot(run: BubblesRun, angle: number): ShotResult {
  if (run.over) return noShot(run)
  const flight = trace(run.cells, run.parity, angle)
  if (flight.cell < 0) return noShot(run)
  const rng = createRng(run.rngState)
  const shot = run.current
  const placement = place(run.cells, run.parity, flight.cell, shot)
  const removed = placement.popped.length + placement.fallen.length
  const hitSomething = placement.popped.length > 0

  const combo = hitSomething ? run.combo + 1 : 0
  const points = hitSomething
    ? Math.round(basePoints(placement.popped.length, placement.fallen.length) * comboMultiplier(combo))
    : 0

  // Goal progress.
  let progress = run.progress
  let marked = run.marked
  if (run.goal?.type === 'free' && removed > 0) {
    const gone = new Set([...placement.popped, ...placement.fallen].map((b) => b.cell))
    progress += marked.filter((cell) => gone.has(cell)).length
    marked = marked.filter((cell) => !gone.has(cell))
  } else if (run.goal?.type === 'color') {
    const color = run.goal.color
    progress += placement.popped.filter((b) => b.value === color).length
  }

  let next: BubblesRun = {
    ...run,
    cells: placement.cells,
    marked,
    progress,
    combo,
    score: run.score + points,
    shots: run.shots + 1,
    shotsLeft: run.shotsLeft > 0 ? run.shotsLeft - 1 : run.shotsLeft,
    misses: hitSomething ? run.misses : run.misses + 1,
  }

  // Specials earned by this shot.
  let earned: Shot | null = null
  if (hasSpecials(run.variant) && hitSomething) {
    if (combo % BOMB_COMBO === 0) earned = BOMB
    else if (removed >= RAINBOW_REMOVED) earned = RAINBOW
  }

  // An empty field: bonus and new rows (endless, time).
  let cleared = false
  if (isFieldEmpty(next.cells)) {
    cleared = true
    if (run.variant !== 'levels') {
      next = {
        ...next,
        score: next.score + CLEAR_BONUS,
        cells: fillRows(rng, next.parity, START_ROWS[run.variant], next.colors),
        misses: 0,
      }
    }
  }

  // Too many misses: a new row (endless).
  let pushed = false
  if (run.variant === 'endless' && next.misses >= missLimit(next.rows)) {
    next = { ...pushRowWith(next, rng), misses: 0 }
    pushed = true
  }

  // The bubbles waiting at the shooter.
  const upcoming = earned ?? drawShot(rng, next.cells, next.colors)
  next = {
    ...next,
    current: refreshShot(rng, next.next, next.cells, next.colors),
    next: refreshShot(rng, upcoming, next.cells, next.colors),
  }

  // End of the run.
  if (run.variant === 'levels') {
    if (goalReached(next)) next = { ...next, over: true, won: true }
    else if (isFieldEmpty(next.cells) || reachedLimit(next.cells) || next.shotsLeft === 0) {
      next = { ...next, over: true, won: false }
    }
  } else if (reachedLimit(next.cells)) {
    next = { ...next, over: true, won: false }
  }

  return {
    run: { ...next, rngState: rng.getState() },
    path: flight.points,
    cell: flight.cell,
    shot,
    placedAs: placement.placedAs,
    popped: placement.popped,
    fallen: placement.fallen,
    points,
    pushed,
    cleared,
    earned,
  }
}

/** Final score of a won level: points plus a bonus per unused shot. */
export const levelBonus = (run: Pick<BubblesRun, 'shotsLeft'>): number => Math.max(0, run.shotsLeft) * SHOT_BONUS

// ---------------------------------------------------------------------------
// Saved runs

function parseGoal(raw: unknown): Goal | null | undefined {
  if (raw === null) return null
  if (typeof raw !== 'object') return undefined
  const goal = raw as Partial<Record<string, unknown>>
  switch (goal.type) {
    case 'clear':
      return { type: 'clear' }
    case 'free':
      return isNonNegativeInt(goal.count) ? { type: 'free', count: goal.count } : undefined
    case 'color':
      return isNonNegativeInt(goal.count) && isColor(goal.color as number)
        ? { type: 'color', color: goal.color as number, count: goal.count }
        : undefined
    case 'score':
      return isNonNegativeInt(goal.target) ? { type: 'score', target: goal.target } : undefined
    default:
      return undefined
  }
}

const isCellValue = (value: unknown): boolean =>
  typeof value === 'number' && (value === EMPTY || value === STONE || isColor(value))

/** Validates a saved run (`undefined` when it does not fit). */
export function parseRun(raw: unknown, variant: Variant): BubblesRun | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const run = raw as Partial<BubblesRun>
  if (run.variant !== variant || run.over) return undefined
  if (!Array.isArray(run.cells) || run.cells.length !== CELLS || !run.cells.every(isCellValue)) return undefined
  if (run.parity !== 0 && run.parity !== 1) return undefined
  if (!Array.isArray(run.marked) || !run.marked.every((cell) => isNonNegativeInt(cell) && cell < CELLS)) return undefined
  if (!isShot(run.current) || !isShot(run.next) || !isSpeed(run.speed)) return undefined
  const goal = parseGoal(run.goal ?? null)
  if (goal === undefined) return undefined
  const counts = [run.level, run.colors, run.progress, run.shots, run.misses, run.combo, run.rows, run.clockMs, run.score, run.rngState]
  if (!counts.every(isNonNegativeInt) || !isInt(run.shotsLeft) || run.shotsLeft < -1) return undefined
  if (run.colors! < 1 || run.colors! > COLOR_COUNT) return undefined
  if (variant === 'levels' && (run.level! < 1 || goal === null)) return undefined
  // Cells that do not exist in this parity must be empty.
  if (run.cells.some((value, cell) => value !== EMPTY && !isCell(cell, run.parity!))) return undefined
  return {
    variant,
    level: run.level!,
    speed: run.speed,
    cells: [...run.cells],
    parity: run.parity,
    marked: [...run.marked],
    current: run.current,
    next: run.next,
    colors: run.colors!,
    goal,
    progress: run.progress!,
    shotsLeft: run.shotsLeft,
    shots: run.shots!,
    misses: run.misses!,
    combo: run.combo!,
    rows: run.rows!,
    clockMs: run.clockMs!,
    score: run.score!,
    rngState: run.rngState!,
    over: false,
    won: false,
  }
}

