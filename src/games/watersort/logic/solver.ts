/**
 * Water Sort solver: depth-first search over canonical states (the order of the tubes does
 * not matter) with move ordering and pruning of useless moves. Not necessarily the shortest
 * solution – it is used to check that a level is solvable and to give hints.
 */
import { isComplete, isSolved, pour, pourAmount, topRun } from './rules'
import type { Move, Tubes } from './types'

const NODE_BUDGET = 150_000

const key = (tubes: Tubes): string =>
  tubes
    .map((tube) => tube.join(','))
    .sort()
    .join('|')

function candidateMoves(tubes: Tubes): Move[] {
  const moves: { move: Move; score: number }[] = []
  tubes.forEach((source, from) => {
    const run = topRun(source)
    if (!run || isComplete(source)) return
    const single = run.count === source.length
    let triedEmpty = false
    tubes.forEach((target, to) => {
      if (!pourAmount(tubes, { from, to })) return
      if (target.length === 0) {
        // Moving a one-colour tube into an empty tube changes nothing; one empty target is enough.
        if (single || triedEmpty) return
        triedEmpty = true
        moves.push({ move: { from, to }, score: 0 })
        return
      }
      const amount = pourAmount(tubes, { from, to })
      const completes = target.length + amount === 4 && target.every((c) => c === run.color)
      const clears = amount === run.count && run.count === source.length
      moves.push({ move: { from, to }, score: (completes ? 4 : 0) + (clears ? 2 : 0) + (amount === run.count ? 1 : 0) + 1 })
    })
  })
  return moves.sort((a, b) => b.score - a.score).map((m) => m.move)
}

/** Moves that solve the level from `tubes`, [] if already solved, null if none was found. */
export function solve(tubes: Tubes): Move[] | null {
  if (isSolved(tubes)) return []
  const visited = new Set<string>([key(tubes)])
  const stack: { tubes: Tubes; moves: Move[]; index: number; path: Move[] }[] = [
    { tubes, moves: candidateMoves(tubes), index: 0, path: [] },
  ]
  let nodes = 0
  while (stack.length > 0) {
    const top = stack[stack.length - 1]!
    if (top.index >= top.moves.length) {
      stack.pop()
      continue
    }
    const move = top.moves[top.index++]!
    const result = pour(top.tubes, move)!
    const k = key(result.tubes)
    if (visited.has(k)) continue
    visited.add(k)
    const path = [...top.path, move]
    if (isSolved(result.tubes)) return path
    if (++nodes > NODE_BUDGET) return null
    stack.push({ tubes: result.tubes, moves: candidateMoves(result.tubes), index: 0, path })
  }
  return null
}
