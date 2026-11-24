/**
 * Game rules: revealing, flagging, chording, win detection and mistakes.
 */
import { floodFill, neighbourTable, puzzleInfo } from './board'
import { COVERED, FLAGGED, REVEALED, type CellState, type MinesPuzzle } from './types'

export type MoveResult =
  | { kind: 'none' }
  | { kind: 'ok'; cells: CellState[]; revealed: number[] }
  | { kind: 'hit'; cells: CellState[]; mine: number }

/** The board at the start of an attempt: everything covered except the start area. */
export function initialCells(puzzle: MinesPuzzle): CellState[] {
  const cells = new Array<CellState>(puzzle.width * puzzle.height).fill(COVERED)
  const result = reveal(puzzle, cells, puzzle.start)
  return result.kind === 'ok' ? result.cells : cells
}

/** Number of adjacent mines of a cell. */
const adjacentMines = (puzzle: MinesPuzzle, cell: number): number => puzzleInfo(puzzle).counts[cell]!

export const isMineCell = (puzzle: MinesPuzzle, cell: number): boolean => puzzleInfo(puzzle).isMine[cell] === 1

/** Opens several covered cells (and the flood fill of cells without adjacent mines). */
function open(puzzle: MinesPuzzle, cells: readonly CellState[], targets: readonly number[]): MoveResult {
  const { counts, isMine } = puzzleInfo(puzzle)
  const mine = targets.find((cell) => isMine[cell] && cells[cell] === COVERED)
  if (mine !== undefined) {
    const next = [...cells]
    next[mine] = REVEALED
    return { kind: 'hit', cells: next, mine }
  }
  const next = [...cells]
  const revealed: number[] = []
  for (const target of targets) {
    if (next[target] !== COVERED) continue
    for (const cell of floodFill(puzzle.width, puzzle.height, counts, target, (c) => next[c] === COVERED)) {
      next[cell] = REVEALED
      revealed.push(cell)
    }
  }
  return revealed.length ? { kind: 'ok', cells: next, revealed } : { kind: 'none' }
}

/** Reveals a covered cell; flagged and revealed cells are ignored. */
export function reveal(puzzle: MinesPuzzle, cells: readonly CellState[], cell: number): MoveResult {
  if (cells[cell] !== COVERED) return { kind: 'none' }
  return open(puzzle, cells, [cell])
}

/** Flags a covered cell or removes a flag; returns null for revealed cells. */
export function toggleFlag(cells: readonly CellState[], cell: number): CellState[] | null {
  if (cells[cell] === REVEALED) return null
  const next = [...cells]
  next[cell] = cells[cell] === FLAGGED ? COVERED : FLAGGED
  return next
}

/** Flags adjacent to a cell. */
function adjacentFlags(puzzle: MinesPuzzle, cells: readonly CellState[], cell: number): number {
  return neighbourTable(puzzle.width, puzzle.height)[cell]!.filter((n) => cells[n] === FLAGGED).length
}

/**
 * Tapping a revealed number whose adjacent flags match it reveals its other covered
 * neighbours. With a wrong flag this can hit a mine.
 */
export function chord(puzzle: MinesPuzzle, cells: readonly CellState[], cell: number): MoveResult {
  if (cells[cell] !== REVEALED) return { kind: 'none' }
  const number = adjacentMines(puzzle, cell)
  if (number === 0 || adjacentFlags(puzzle, cells, cell) !== number) return { kind: 'none' }
  const covered = neighbourTable(puzzle.width, puzzle.height)[cell]!.filter((n) => cells[n] === COVERED)
  return open(puzzle, cells, covered)
}

/** Every safe cell is revealed. */
export function isSolved(puzzle: MinesPuzzle, cells: readonly CellState[]): boolean {
  const { isMine } = puzzleInfo(puzzle)
  return cells.every((state, cell) => isMine[cell] || state === REVEALED)
}

/** The final board after a win: all mines flagged. */
export function flagAllMines(puzzle: MinesPuzzle, cells: readonly CellState[]): CellState[] {
  const next = [...cells]
  for (const mine of puzzle.mines) next[mine] = FLAGGED
  return next
}

/** Flags on cells without a mine. */
export function wrongFlags(puzzle: MinesPuzzle, cells: readonly CellState[]): number[] {
  const { isMine } = puzzleInfo(puzzle)
  const result: number[] = []
  cells.forEach((state, cell) => {
    if (state === FLAGGED && !isMine[cell]) result.push(cell)
  })
  return result
}

/** Mines minus flags (can become negative with too many flags). */
export function minesLeft(puzzle: MinesPuzzle, cells: readonly CellState[]): number {
  return puzzle.mines.length - cells.filter((state) => state === FLAGGED).length
}
