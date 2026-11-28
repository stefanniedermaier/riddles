/**
 * Generated levels: level n is built from a seed of its number, so it is the same on every
 * device and nothing has to be stored. Difficulty grows with the number of colours, the
 * field height, stones and – from the goal – the kind of task.
 *
 * Every level is played by the greedy bot (`bot.ts`) before it is handed out: the shot limit
 * is the bot's shot count plus some slack, and the bot's count is the par for three stars. A
 * layout the bot cannot finish is replaced by the next attempt, so every level is solvable.
 */
import { createRng, hashSeed, type Rng } from '@/core/rng'

import { playOut } from './bot'
import { emptyCells, fieldColors, fillRows, floating, newRun, type Goal, type LevelSetup } from './engine'
import { COLS, isCell, neighbours, rowOf, rowWidth, type Parity } from './grid'
import { EMPTY, isColor, STONE } from './types'

export interface LevelDef extends LevelSetup {
  /** Shots the bot needed: three stars at or below it. */
  par: number
}

export type GoalKind = Goal['type']

/** Goals in the order they repeat (level 1 is "clear the field"). */
const GOAL_CYCLE: readonly GoalKind[] = ['clear', 'free', 'color', 'clear', 'score']

/** The bot may use at most this many shots for a level. */
const MAX_BOT_SHOTS = 70
const MAX_ATTEMPTS = 24
/** People play less exactly than the bot: never fewer shots than this. */
const MIN_SHOTS = 8

export const colorsFor = (level: number): number => (level <= 4 ? 3 : level <= 12 ? 4 : level <= 30 ? 5 : 6)
export const rowsFor = (level: number): number => 4 + Math.min(5, Math.floor(level / 5))
export const stonesFor = (level: number): number => (level < 10 ? 0 : Math.min(6, Math.floor((level - 6) / 4)))
export const goalFor = (level: number): GoalKind => GOAL_CYCLE[(level - 1) % GOAL_CYCLE.length]!

/** Slack on top of the bot's shots: generous early on, tighter later. */
const slackFor = (level: number): number => Math.max(1.3, 1.6 - level * 0.004)

/** Stones in the lower rows, never next to each other and never holding the field up. */
function placeStones(rng: Rng, cells: number[], parity: Parity, rows: number, count: number): void {
  const candidates: number[] = []
  for (let row = 2; row < rows; row++) {
    for (let col = 0; col < rowWidth(row, parity); col++) candidates.push(row * COLS + col)
  }
  rng.shuffle(candidates)
  let placed = 0
  for (const cell of candidates) {
    if (placed >= count) break
    if (neighbours(cell, parity).some((n) => cells[n] === STONE)) continue
    const before = cells[cell]!
    cells[cell] = STONE
    // Every colour bubble must still be connected to the ceiling through colour bubbles, or it
    // could never be brought down by popping alone.
    if (floatingWithoutStones(cells, parity)) cells[cell] = before
    else placed++
  }
}

function floatingWithoutStones(cells: readonly number[], parity: Parity): boolean {
  const colorsOnly = cells.map((value) => (value === STONE ? EMPTY : value))
  return floating(colorsOnly, parity).length > 0
}

/** Marked bubbles for the goal "free": colour bubbles in the upper half. */
function pickMarked(rng: Rng, cells: readonly number[], rows: number, count: number): number[] {
  const upper: number[] = []
  for (let cell = 0; cell < cells.length; cell++) {
    if (isColor(cells[cell]!) && rowOf(cell) < Math.max(2, Math.ceil(rows / 2))) upper.push(cell)
  }
  return rng.shuffle(upper).slice(0, count).sort((a, b) => a - b)
}

function layout(level: number, seed: number): Omit<LevelSetup, 'shots'> {
  const rng = createRng(hashSeed(seed, 'layout'))
  const parity: Parity = 0
  const colors = colorsFor(level)
  const rows = rowsFor(level)
  const cells = fillRows(rng, parity, rows, colors)
  placeStones(rng, cells, parity, rows, stonesFor(level))
  const kind = goalFor(level)
  let goal: Goal = { type: 'clear' }
  let marked: number[] = []
  if (kind === 'free') {
    marked = pickMarked(rng, cells, rows, 3 + Math.min(4, Math.floor(level / 10)))
    goal = { type: 'free', count: marked.length }
  } else if (kind === 'color') {
    const color = rng.pick(fieldColors(cells))
    const count = cells.filter((value) => value === color).length
    goal = { type: 'color', color, count: Math.max(5, Math.round(count * 0.7)) }
  } else if (kind === 'score') {
    goal = { type: 'score', target: 0 } // set from the bot's game below
  }
  return { level, seed, colors, cells, marked, goal }
}

/** Builds and calibrates a level (deterministic; `getLevel` caches it). */
export function buildLevel(level: number): LevelDef {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const seed = hashSeed('bubbles-level', level, attempt)
    const setup = layout(level, seed)
    if (setup.goal.type === 'score') {
      // The target: three quarters of what the bot scores while clearing the field.
      const probe = playOut(newRun('levels', 0, { level: { ...setup, goal: { type: 'clear' }, shots: -1 } }), MAX_BOT_SHOTS)
      if (!probe.run.won) continue
      const target = Math.max(100, Math.floor((probe.run.score * 0.75) / 50) * 50)
      const shots = probe.scores.findIndex((score) => score >= target) + 1
      return finish(setup, { type: 'score', target }, shots)
    }
    const game = playOut(newRun('levels', 0, { level: { ...setup, shots: -1 } }), MAX_BOT_SHOTS)
    if (game.run.won) return finish(setup, setup.goal, game.run.shots)
  }
  // Never reached in practice (tested for levels 1 … 100): a small, easy field.
  const cells = emptyCells()
  for (let cell = 0; cell < COLS * 2; cell++) if (isCell(cell, 0)) cells[cell] = cell % 2
  return { level, seed: hashSeed('bubbles-level', level), colors: 2, cells, marked: [], goal: { type: 'clear' }, shots: 30, par: 20 }
}

function finish(setup: Omit<LevelSetup, 'shots'>, goal: Goal, par: number): LevelDef {
  const shots = Math.max(MIN_SHOTS, Math.ceil(par * slackFor(setup.level)) + 3)
  return { ...setup, goal, shots, par }
}

const cache = new Map<number, LevelDef>()

export function getLevel(level: number): LevelDef {
  let def = cache.get(level)
  if (!def) {
    def = buildLevel(level)
    cache.set(level, def)
  }
  return def
}
