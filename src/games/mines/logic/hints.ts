/**
 * Hints: point out wrong flags first, otherwise the next logical step of the solver on the
 * player's board (revealed numbers + flags).
 */
import { puzzleInfo } from './board'
import { reveal, toggleFlag, wrongFlags } from './rules'
import { findStep, type Step } from './solver'
import { FLAGGED, REVEALED, type CellState, type MinesPuzzle } from './types'

export type Hint = { kind: 'wrong'; cells: number[] } | { kind: 'step'; step: Step } | { kind: 'none' }

export function getHint(puzzle: MinesPuzzle, cells: readonly CellState[]): Hint {
  const wrong = wrongFlags(puzzle, cells)
  if (wrong.length) return { kind: 'wrong', cells: wrong }
  const { counts } = puzzleInfo(puzzle)
  // Only correct flags are left, so they can be used as known mines.
  const step = findStep({
    width: puzzle.width,
    height: puzzle.height,
    numbers: Int8Array.from(cells, (state, cell) => (state === REVEALED ? counts[cell]! : -1)),
    mines: Uint8Array.from(cells, (state) => (state === FLAGGED ? 1 : 0)),
    totalMines: puzzle.mines.length,
  })
  return step ? { kind: 'step', step } : { kind: 'none' }
}

/** The board after following a hint: wrong flags removed, or mines flagged and safe cells revealed. */
export function applyHint(puzzle: MinesPuzzle, cells: readonly CellState[], hint: Hint): CellState[] {
  let next = [...cells]
  if (hint.kind === 'wrong') {
    for (const cell of hint.cells) next = toggleFlag(next, cell) ?? next
  } else if (hint.kind === 'step') {
    for (const mine of hint.step.mines) if (next[mine] !== FLAGGED) next = toggleFlag(next, mine) ?? next
    for (const cell of hint.step.safe) {
      const result = reveal(puzzle, next, cell)
      if (result.kind === 'ok') next = result.cells
    }
  }
  return next
}
