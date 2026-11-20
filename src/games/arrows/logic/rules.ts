/**
 * Game rules on top of the analysis: tapping arrows, lives, completion and hints.
 */
import { blockerOf, freeArrows, occupancy } from './analysis'
import { LIVES, type ArrowsPuzzle } from './types'

export interface PlayState {
  removed: number[]
  lives: number
}

export type TapResult =
  | { kind: 'none' }
  | { kind: 'exit'; arrow: number; state: PlayState; solved: boolean }
  | { kind: 'blocked'; arrow: number; blocker: number; state: PlayState; failed: boolean }

export function freshState(): PlayState {
  return { removed: [], lives: LIVES }
}

/** Arrow on `cell` that is still on the board, or -1. */
export function arrowAt(puzzle: ArrowsPuzzle, removed: readonly number[], cell: number): number {
  return occupancy(puzzle, removed)[cell] ?? -1
}

export const isSolved = (puzzle: ArrowsPuzzle, removed: readonly number[]): boolean =>
  removed.length === puzzle.arrows.length

/**
 * Taps the arrow `id`: it leaves the board when its way is free, otherwise it bumps into the
 * first arrow in the way and one life is lost.
 */
export function tapArrow(puzzle: ArrowsPuzzle, state: PlayState, id: number): TapResult {
  const arrow = puzzle.arrows[id]
  if (!arrow || state.removed.includes(id) || state.lives <= 0) return { kind: 'none' }
  const blocker = blockerOf(puzzle, occupancy(puzzle, state.removed), arrow)
  if (blocker === null) {
    const removed = [...state.removed, id]
    return { kind: 'exit', arrow: id, state: { ...state, removed }, solved: isSolved(puzzle, removed) }
  }
  const lives = state.lives - 1
  return { kind: 'blocked', arrow: id, blocker, state: { ...state, lives }, failed: lives <= 0 }
}

/**
 * An arrow that can leave now. Prefers the one whose departure frees the most other arrows,
 * so following hints always makes progress; null when the board is empty.
 */
export function hintArrow(puzzle: ArrowsPuzzle, removed: readonly number[]): number | null {
  const free = freeArrows(puzzle, removed)
  if (free.length === 0) return null
  const before = free.length
  let best = free[0]!
  let bestGain = -Infinity
  for (const id of free) {
    const gain = freeArrows(puzzle, [...removed, id]).length - (before - 1)
    if (gain > bestGain) {
      bestGain = gain
      best = id
    }
  }
  return best
}
