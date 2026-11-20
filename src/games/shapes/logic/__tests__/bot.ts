import { createRng } from '@/core/rng'

import { listMoves } from '../board'
import { getLevel, goalStatus } from '../levels'
import { createRun, playMove, type ShapesRun } from '../modes'
import { ITEM_KIND, SIZE } from '../types'

/** Sum of the rows of all drop items (higher = closer to the bottom). */
function itemDepth(run: ShapesRun): number {
  let depth = 0
  run.board.forEach((piece, cell) => {
    if (piece?.kind === ITEM_KIND) depth += Math.floor(cell / SIZE)
  })
  return depth
}

/** How much a run progressed towards its level goals (0 … number of goals). */
function progressValue(run: ShapesRun): number {
  const level = run.level!
  const def = getLevel(level.n)
  const goals = goalStatus(def, run.score, level.progress, level.field)
  // Items: progress = rows travelled (a collected item counts as a full board height).
  const items = goals.some((g) => g.goal.type === 'items')
    ? (itemDepth(run) + level.progress.items * SIZE) * 0.05
    : 0
  return goals.reduce((sum, g) => sum + g.current / g.target, 0) + items
}

/**
 * A "casual player": plays `greedyShare` of its moves greedily (best goal progress, then
 * score) and the rest randomly. Returns whether level `n` was won.
 */
export function botPlayLevel(n: number, seed: number, greedyShare = 0.5, unlimited = false) {
  const rng = createRng(seed)
  let run = createRun('levels', 0, n)
  if (unlimited) run = { ...run, level: { ...run.level!, movesLeft: 500 } }
  for (;;) {
    const moves = listMoves(run.board, run.level!.field)
    let pick = moves[rng.int(moves.length)]!
    if (rng.next() < greedyShare) {
      let best = -Infinity
      for (const move of moves) {
        const outcome = playMove(run, move.a, move.b)
        const value = progressValue(outcome.run) * 1000 + outcome.run.score / 100
        if (value > best) {
          best = value
          pick = move
        }
      }
    }
    const outcome = playMove(run, pick.a, pick.b)
    run = outcome.run
    if (outcome.levelState !== 'playing') {
      return {
        won: outcome.levelState === 'won',
        movesLeft: run.level!.movesLeft,
        movesUsed: run.movesMade,
        run,
      }
    }
  }
}
