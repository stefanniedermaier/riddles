import { ALL_DIGITS } from '../board'
import type { LogicState } from '../techniques'

/** Parses an 81-character puzzle string ('0' or '.' = empty). */
function parseGrid(text: string): number[] {
  const digits = text.replace(/\s/g, '').split('').map((ch) => (ch === '.' ? 0 : Number(ch)))
  if (digits.length !== 81) throw new Error('grid must have 81 cells')
  return digits
}

/** Empty board where every cell still has all candidates – for hand-crafted positions. */
export function openState(): LogicState {
  return { values: new Array<number>(81).fill(0), cands: new Uint16Array(81).fill(ALL_DIGITS) }
}

export function removeCandidate(state: LogicState, cells: number[], digit: number): void {
  for (const cell of cells) state.cands[cell]! &= ~(1 << digit)
}

export function setCandidates(state: LogicState, cell: number, digits: number[]): void {
  state.cands[cell] = digits.reduce((mask, d) => mask | (1 << d), 0)
}

/** A well-known puzzle that is solvable with singles only. */
export const EASY_PUZZLE = parseGrid(
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
)
export const EASY_SOLUTION = parseGrid(
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
)
