import { createRng } from '@/core/rng'

import { createBoard } from './board'
import { getLevel, goalsMet, starsFor, type LevelProgress } from './levels'
import { resolveMove, type ResolveResult } from './resolve'
import {
  CELLS,
  KIND_COUNT,
  type Board,
  type EngineContext,
  type Mode,
  type Piece,
  type Special,
} from './types'

export const TIME_LIMIT_MS = 90_000
export const SPECIAL_TIME_BONUS_MS = 2_000
export const CASCADE_TIME_BONUS_MS = 1_000
/** Cascade depth that earns the cascade time bonus. */
export const CASCADE_BONUS_DEPTH = 3

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
  level?: { n: number; movesLeft: number; progress: LevelProgress }
}

export function createRun(mode: Mode, seed: number, levelNumber = 1): ShapesRun {
  const def = mode === 'levels' ? getLevel(levelNumber) : null
  const rng = createRng(def ? def.seed : seed)
  const ctx: EngineContext = { rng, kinds: def ? def.kinds : KIND_COUNT, nextId: 1 }
  const board = createBoard(ctx)
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
      ? {
          n: def.level,
          movesLeft: def.moves,
          progress: { collected: new Array<number>(KIND_COUNT).fill(0), specials: 0 },
        }
      : undefined,
  }
}

export type LevelState = 'playing' | 'won' | 'lost'

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
  const result = resolveMove(run.board, a, b, ctx)
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
    }
    const movesLeft = run.level.movesLeft - 1
    next.level = { n: run.level.n, movesLeft, progress }
    const def = getLevel(run.level.n)
    if (goalsMet(def, next.score, progress)) levelState = 'won'
    else if (movesLeft <= 0) levelState = 'lost'
  }

  return { result, run: next, timeBonusMs, levelState }
}

export interface LevelCompletion {
  bonus: number
  finalScore: number
  stars: 1 | 2 | 3
}

/** Final score of a won level including the bonus for unused moves. */
export function completeLevel(run: ShapesRun): LevelCompletion {
  const def = getLevel(run.level?.n ?? 1)
  const bonus = Math.max(0, run.level?.movesLeft ?? 0) * def.moveBonus
  const finalScore = run.score + bonus
  return { bonus, finalScore, stars: starsFor(def, finalScore) }
}

// ---------------------------------------------------------------------------
// Validation of persisted runs

const SPECIALS: readonly Special[] = ['none', 'line-h', 'line-v', 'burst', 'prism']

const isInt = (value: unknown): value is number => Number.isInteger(value)

function isPiece(value: unknown): value is Piece {
  if (typeof value !== 'object' || value === null) return false
  const piece = value as Piece
  return (
    isInt(piece.id) &&
    isInt(piece.kind) &&
    piece.kind >= -1 &&
    piece.kind < KIND_COUNT &&
    SPECIALS.includes(piece.special)
  )
}

/** Returns the run if `raw` is a valid saved run of `mode`, otherwise `undefined`. */
export function parseRun(raw: unknown, mode: Mode): ShapesRun | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const run = raw as ShapesRun
  if (run.mode !== mode) return undefined
  if (!Array.isArray(run.board) || run.board.length !== CELLS || !run.board.every(isPiece)) {
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
      !isInt(level.progress.specials)
    ) {
      return undefined
    }
  }
  return run
}
