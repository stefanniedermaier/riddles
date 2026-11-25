import { isInt } from '@/core/guards'
import { createRng } from '@/core/rng'

import { createBoard } from './board'
import { createLevelField, getLevel, goalsMet, type LevelProgress } from './levels'
import { resolveMove, type ResolveResult } from './resolve'
import {
  CELLS,
  ITEM_KIND,
  KIND_COUNT,
  type Board,
  type EngineContext,
  type Field,
  type Mode,
  type Piece,
  type Special,
} from './types'

export const TIME_LIMIT_MS = 90_000
const SPECIAL_TIME_BONUS_MS = 2_000
const CASCADE_TIME_BONUS_MS = 1_000
/** Cascade depth that earns the cascade time bonus. */
const CASCADE_BONUS_DEPTH = 3

/** Everything needed to continue a run – this is what gets persisted. */
export interface ShapesRun {
  mode: Mode
  board: Board
  score: number
  rngState: number
  nextId: number
  kinds: number
  movesMade: number
  /** Time mode only. */
  time?: { limitMs: number; elapsedMs: number }
  /** Levels mode only. */
  level?: { n: number; movesLeft: number; progress: LevelProgress; field: Field }
}

function emptyProgress(): LevelProgress {
  return { collected: new Array<number>(KIND_COUNT).fill(0), specials: 0, items: 0 }
}

export function createRun(mode: Mode, seed: number, levelNumber = 1): ShapesRun {
  const def = mode === 'levels' ? getLevel(levelNumber) : null
  const rng = createRng(def ? def.seed : seed)
  const ctx: EngineContext = { rng, kinds: def ? def.kinds : KIND_COUNT, nextId: 1 }
  const field = def ? createLevelField(def) : undefined
  const board = createBoard(ctx, field, def?.layout.itemStart)
  return {
    mode,
    board,
    score: 0,
    rngState: rng.getState(),
    nextId: ctx.nextId,
    kinds: ctx.kinds,
    movesMade: 0,
    time: mode === 'time' ? { limitMs: TIME_LIMIT_MS, elapsedMs: 0 } : undefined,
    level: def
      ? { n: def.level, movesLeft: def.moves, progress: emptyProgress(), field: field! }
      : undefined,
  }
}

type LevelState = 'playing' | 'won' | 'lost'

export interface MoveOutcome {
  result: ResolveResult
  /** Updated run (identical to the input for invalid moves). */
  run: ShapesRun
  /** Extra time earned in time mode. */
  timeBonusMs: number
  levelState: LevelState
}

/** Applies a player's swap to a run. Pure: the input run is not modified. */
export function playMove(run: ShapesRun, a: number, b: number): MoveOutcome {
  const ctx: EngineContext = { rng: createRng(run.rngState), kinds: run.kinds, nextId: run.nextId }
  const result = resolveMove(run.board, a, b, ctx, run.level?.field)
  if (!result.valid) return { result, run, timeBonusMs: 0, levelState: 'playing' }

  const { summary } = result
  const next: ShapesRun = {
    ...run,
    board: result.board,
    score: run.score + summary.score,
    rngState: ctx.rng.getState(),
    nextId: ctx.nextId,
    movesMade: run.movesMade + 1,
  }

  let timeBonusMs = 0
  if (run.mode === 'time' && run.time) {
    timeBonusMs =
      summary.specialsCreated * SPECIAL_TIME_BONUS_MS +
      (summary.maxCascade >= CASCADE_BONUS_DEPTH ? CASCADE_TIME_BONUS_MS : 0)
    next.time = { ...run.time, limitMs: run.time.limitMs + timeBonusMs }
  }

  let levelState: LevelState = 'playing'
  if (run.mode === 'levels' && run.level) {
    const progress: LevelProgress = {
      collected: run.level.progress.collected.map((n, kind) => n + (summary.clearedByKind[kind] ?? 0)),
      specials: run.level.progress.specials + summary.specialsCreated,
      items: run.level.progress.items + summary.itemsCollected,
    }
    const movesLeft = run.level.movesLeft - 1
    const field = result.field ?? run.level.field
    next.level = { n: run.level.n, movesLeft, progress, field }
    const def = getLevel(run.level.n)
    if (goalsMet(def, next.score, progress, field)) levelState = 'won'
    else if (movesLeft <= 0) levelState = 'lost'
  }

  return { result, run: next, timeBonusMs, levelState }
}

export interface LevelCompletion {
  bonus: number
  finalScore: number
}

/** Final score of a won level including the bonus for unused moves. */
export function completeLevel(run: ShapesRun): LevelCompletion {
  const def = getLevel(run.level?.n ?? 1)
  const bonus = Math.max(0, run.level?.movesLeft ?? 0) * def.moveBonus
  return { bonus, finalScore: run.score + bonus }
}

// ---------------------------------------------------------------------------
// Validation of persisted runs

const SPECIALS: readonly Special[] = ['none', 'line-h', 'line-v', 'burst', 'prism']


function isPiece(value: unknown): value is Piece {
  if (typeof value !== 'object' || value === null) return false
  const piece = value as Piece
  return (
    isInt(piece.id) &&
    isInt(piece.kind) &&
    piece.kind >= ITEM_KIND &&
    piece.kind < KIND_COUNT &&
    SPECIALS.includes(piece.special)
  )
}

/** Returns the run if `raw` is a valid saved run of `mode`, otherwise `undefined`. */
export function parseRun(raw: unknown, mode: Mode): ShapesRun | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const run = raw as ShapesRun
  if (run.mode !== mode) return undefined
  const field = mode === 'levels' ? parseField(run.level?.field) : undefined
  if (mode === 'levels' && !field) return undefined
  if (
    !Array.isArray(run.board) ||
    run.board.length !== CELLS ||
    // Only crate cells may be empty.
    !run.board.every((piece, cell) =>
      field && field.crates[cell]! > 0 ? piece === null : isPiece(piece),
    )
  ) {
    return undefined
  }
  if (![run.score, run.rngState, run.nextId, run.kinds, run.movesMade].every(isInt)) return undefined
  if (run.kinds < 3 || run.kinds > KIND_COUNT) return undefined
  if (mode === 'time') {
    if (!run.time || typeof run.time.limitMs !== 'number' || typeof run.time.elapsedMs !== 'number') {
      return undefined
    }
  }
  if (mode === 'levels') {
    const level = run.level
    if (
      !level ||
      !isInt(level.n) ||
      level.n < 1 ||
      !isInt(level.movesLeft) ||
      !Array.isArray(level.progress?.collected) ||
      level.progress.collected.length !== KIND_COUNT ||
      !isInt(level.progress.specials) ||
      !isInt(level.progress.items)
    ) {
      return undefined
    }
  }
  return run
}

function parseField(raw: unknown): Field | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const field = raw as Field
  const cells = (value: unknown) =>
    Array.isArray(value) && value.length === CELLS && value.every((n) => isInt(n) && n >= 0 && n <= 9)
  if (!cells(field.crates) || !cells(field.targets) || !cells(field.chains)) return undefined
  if (!isInt(field.itemsPending) || !isInt(field.maxItems)) return undefined
  return field
}
