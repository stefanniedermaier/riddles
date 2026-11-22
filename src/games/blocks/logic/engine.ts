/**
 * Blocks engine – pure and deterministic.
 *
 * The board is an 8×8 array of colours (0 = empty). Three pieces wait in the tray; placing
 * one fills its cells, then every full row and column is cleared. When the tray is empty a
 * new one is dealt (always with at least one piece that fits). The game is over when no
 * piece in the tray fits. The RNG state is part of the run, so a reloaded game continues
 * exactly as it would have.
 */
import { createRng, type Rng } from '@/core/rng'

import { COLOR_COUNT, SHAPES, type Cell } from './pieces'

export const SIZE = 8
export const CELLS = SIZE * SIZE
export const TRAY_SIZE = 3
/** Bonus when a clear leaves the board completely empty. */
export const CLEAR_BOARD_BONUS = 300

export interface Piece {
  /** Index into `SHAPES`. */
  shape: number
  /** Colour 1 … COLOR_COUNT. */
  color: number
}

export interface BlocksRun {
  /** Colour per cell, row-major (0 = empty). */
  board: number[]
  /** Pieces waiting to be placed (`null` = already placed). */
  tray: (Piece | null)[]
  score: number
  /** Consecutive placements that cleared at least one line (0 = no combo running). */
  combo: number
  /** Pieces placed. */
  moves: number
  /** Lines cleared in total. */
  lines: number
  rngState: number
  over: boolean
}

export interface PlaceResult {
  run: BlocksRun
  /** Cells filled by the piece. */
  placed: number[]
  clearedRows: number[]
  clearedCols: number[]
  /** Cells emptied by the clear (with their colour before clearing). */
  clearedCells: { cell: number; color: number }[]
  gained: number
  /** Combo level of this placement (≥ 2 shows a combo). */
  combo: number
  boardCleared: boolean
  /** A new tray was dealt after this placement. */
  dealt: boolean
}

export const cellsOf = (piece: Piece): readonly Cell[] => SHAPES[piece.shape]!.cells

/** Board cells covered by `piece` with its top-left corner at `anchor`, or `null` if it does not fit. */
export function footprint(board: readonly number[], piece: Piece, anchor: number): number[] | null {
  const row0 = Math.floor(anchor / SIZE)
  const col0 = anchor % SIZE
  const cells: number[] = []
  for (const [r, c] of cellsOf(piece)) {
    const row = row0 + r
    const col = col0 + c
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return null
    const cell = row * SIZE + col
    if (board[cell] !== 0) return null
    cells.push(cell)
  }
  return cells
}

export function fitsAnywhere(board: readonly number[], piece: Piece): boolean {
  for (let anchor = 0; anchor < CELLS; anchor++) if (footprint(board, piece, anchor)) return true
  return false
}

/** Rows and columns that are full on `board`. */
export function fullLines(board: readonly number[]): { rows: number[]; cols: number[] } {
  const rows: number[] = []
  const cols: number[] = []
  for (let i = 0; i < SIZE; i++) {
    let rowFull = true
    let colFull = true
    for (let j = 0; j < SIZE; j++) {
      if (board[i * SIZE + j] === 0) rowFull = false
      if (board[j * SIZE + i] === 0) colFull = false
    }
    if (rowFull) rows.push(i)
    if (colFull) cols.push(i)
  }
  return { rows, cols }
}

/** Points for clearing `lines` lines with one placement at combo level `combo`. */
export function linePoints(lines: number, combo: number): number {
  if (lines === 0) return 0
  return ((10 * lines * (lines + 1)) / 2) * Math.max(1, combo)
}

const TOTAL_WEIGHT = SHAPES.reduce((sum, shape) => sum + shape.weight, 0)

function randomShape(rng: Rng): number {
  let roll = rng.next() * TOTAL_WEIGHT
  for (let i = 0; i < SHAPES.length; i++) {
    roll -= SHAPES[i]!.weight
    if (roll < 0) return i
  }
  return SHAPES.length - 1
}

/**
 * Deals a new tray. Up to 30 random trays are tried, preferring one where at least two
 * pieces fit (the first 20 tries) and accepting one fitting piece after that. If none is
 * found, one slot is replaced by the largest shape that still fits.
 */
export function dealTray(rng: Rng, board: readonly number[]): Piece[] {
  const piece = (shape: number): Piece => ({ shape, color: 1 + rng.int(COLOR_COUNT) })
  let tray: Piece[] = []
  for (let attempt = 0; attempt < 30; attempt++) {
    tray = Array.from({ length: TRAY_SIZE }, () => piece(randomShape(rng)))
    const fitting = tray.filter((p) => fitsAnywhere(board, p)).length
    if (fitting >= (attempt < 20 ? 2 : 1)) return tray
  }
  const fitting = SHAPES.map((shape, index) => ({ index, size: shape.cells.length }))
    .filter(({ index }) => fitsAnywhere(board, { shape: index, color: 1 }))
    .sort((a, b) => b.size - a.size)
  if (fitting.length > 0) tray[rng.int(TRAY_SIZE)] = piece(fitting[0]!.index)
  return tray
}

const trayFits = (run: Pick<BlocksRun, 'board' | 'tray'>) =>
  run.tray.some((piece) => piece !== null && fitsAnywhere(run.board, piece))

export function newRun(seed: number): BlocksRun {
  const rng = createRng(seed)
  const board = new Array<number>(CELLS).fill(0)
  const tray = dealTray(rng, board)
  return { board, tray, score: 0, combo: 0, moves: 0, lines: 0, rngState: rng.getState(), over: false }
}

/** Places tray piece `slot` with its top-left corner at `anchor`; `null` if not possible. */
export function place(run: BlocksRun, slot: number, anchor: number): PlaceResult | null {
  if (run.over) return null
  const piece = run.tray[slot]
  if (!piece) return null
  const placed = footprint(run.board, piece, anchor)
  if (!placed) return null

  const board = run.board.slice()
  for (const cell of placed) board[cell] = piece.color

  const { rows, cols } = fullLines(board)
  const clearing = new Set<number>()
  for (const row of rows) for (let c = 0; c < SIZE; c++) clearing.add(row * SIZE + c)
  for (const col of cols) for (let r = 0; r < SIZE; r++) clearing.add(r * SIZE + col)
  const clearedCells = [...clearing].sort((a, b) => a - b).map((cell) => ({ cell, color: board[cell]! }))
  for (const cell of clearing) board[cell] = 0

  const lines = rows.length + cols.length
  const combo = lines > 0 ? run.combo + 1 : 0
  const boardCleared = lines > 0 && board.every((color) => color === 0)
  const gained = placed.length + linePoints(lines, combo) + (boardCleared ? CLEAR_BOARD_BONUS : 0)

  let tray = run.tray.map((p, i) => (i === slot ? null : p))
  let rngState = run.rngState
  let dealt = false
  if (tray.every((p) => p === null)) {
    const rng = createRng(rngState)
    tray = dealTray(rng, board)
    rngState = rng.getState()
    dealt = true
  }

  const next: BlocksRun = {
    board,
    tray,
    score: run.score + gained,
    combo,
    moves: run.moves + 1,
    lines: run.lines + lines,
    rngState,
    over: false,
  }
  next.over = !trayFits(next)
  return { run: next, placed, clearedRows: rows, clearedCols: cols, clearedCells, gained, combo, boardCleared, dealt }
}

/** Validates a stored run (returns `undefined` for anything unusable). */
export function parseRun(raw: unknown): BlocksRun | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined
  const r = raw as Partial<BlocksRun>
  const isInt = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0
  if (!Array.isArray(r.board) || r.board.length !== CELLS) return undefined
  if (!r.board.every((v) => isInt(v) && v <= COLOR_COUNT)) return undefined
  if (!Array.isArray(r.tray) || r.tray.length !== TRAY_SIZE) return undefined
  const trayOk = r.tray.every(
    (p) =>
      p === null ||
      (typeof p === 'object' &&
        isInt(p.shape) &&
        p.shape < SHAPES.length &&
        isInt(p.color) &&
        p.color >= 1 &&
        p.color <= COLOR_COUNT),
  )
  if (!trayOk || r.tray.every((p) => p === null)) return undefined
  if (![r.score, r.combo, r.moves, r.lines, r.rngState].every(isInt)) return undefined
  if (typeof r.over !== 'boolean') return undefined
  return r as BlocksRun
}
