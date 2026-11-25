/**
 * Generic patience solver: iterative depth-first search with a transposition table over
 * canonical states and a node budget. Each game supplies its moves (best first), so the
 * search finds a solution quickly where one exists – it does not look for the shortest one.
 */
import type { CardRules } from './game'

const DEFAULT_BUDGET = 150_000

export interface SolveResult<M> {
  /** Moves that win from the start state ([] if already won), or null. */
  moves: M[] | null
  /** True if the budget ran out (null then means "unknown", not "unsolvable"). */
  exhausted: boolean
}

export function solve<S, M, V extends string>(
  rules: CardRules<S, M, V>,
  start: S,
  budget = DEFAULT_BUDGET,
): SolveResult<M> {
  if (rules.isWon(start)) return { moves: [], exhausted: false }
  const visited = new Set<string>([rules.key(start)])
  const stack: { state: S; moves: M[]; index: number; move: M | null }[] = [
    { state: start, moves: rules.solverMoves(start), index: 0, move: null },
  ]
  let nodes = 0
  while (stack.length > 0) {
    const top = stack[stack.length - 1]!
    if (top.index >= top.moves.length) {
      stack.pop()
      continue
    }
    const move = top.moves[top.index++]!
    const next = rules.apply(top.state, move)
    if (!next) continue
    const key = rules.key(next.state)
    if (visited.has(key)) continue
    visited.add(key)
    if (rules.isWon(next.state)) {
      return { moves: [...stack.slice(1).map((frame) => frame.move!), move], exhausted: false }
    }
    if (++nodes > budget) return { moves: null, exhausted: true }
    stack.push({ state: next.state, moves: rules.solverMoves(next.state), index: 0, move })
  }
  return { moves: null, exhausted: false }
}
