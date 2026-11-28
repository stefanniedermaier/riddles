/**
 * The hex grid of Bubbles: 9 columns in offset rows. In unit lengths of one bubble diameter
 * the field is 9 wide; an unshifted row holds 9 bubbles (centres at x = 0.5 … 8.5), a shifted
 * row 8 (x = 1 … 8). Rows are √3⁄2 apart. Which rows are shifted is given by the field's
 * `parity` – it flips whenever a new row is pushed in at the top, so every bubble keeps its
 * place on screen while moving down one row.
 *
 * Cells are numbered `row * COLS + col`; in shifted rows the last column does not exist.
 */
export const COLS = 9
/** Rows in storage. A bubble in row `LIMIT` (below the danger line) ends the game. */
export const ROWS = 14
export const LIMIT = 13
export const CELLS = COLS * ROWS

export const RADIUS = 0.5
export const ROW_HEIGHT = Math.sqrt(3) / 2

/** The shooter: centred below the field. */
export const SHOOTER_X = COLS / 2
export const SHOOTER_Y = RADIUS + LIMIT * ROW_HEIGHT + 1.15
/** Height of the whole board (field, danger line and shooter) in bubble diameters. */
export const BOARD_HEIGHT = SHOOTER_Y + 1.1
/** The danger line, halfway between the last allowed row and the one below it. */
export const DANGER_Y = RADIUS + (LIMIT - 0.5) * ROW_HEIGHT

export type Parity = 0 | 1

export interface Point {
  x: number
  y: number
}

export const rowOf = (cell: number): number => Math.floor(cell / COLS)
const colOf = (cell: number): number => cell % COLS

const isShifted = (row: number, parity: Parity): boolean => (row + parity) % 2 === 1
export const rowWidth = (row: number, parity: Parity): number => (isShifted(row, parity) ? COLS - 1 : COLS)

/** Does the cell exist in this parity (shifted rows have one cell less)? */
export function isCell(cell: number, parity: Parity): boolean {
  if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS) return false
  return colOf(cell) < rowWidth(rowOf(cell), parity)
}

export function centre(cell: number, parity: Parity): Point {
  const row = rowOf(cell)
  const col = colOf(cell)
  return { x: col + (isShifted(row, parity) ? 1 : RADIUS), y: RADIUS + row * ROW_HEIGHT }
}

/** The (up to six) neighbouring cells. */
export function neighbours(cell: number, parity: Parity): number[] {
  const row = rowOf(cell)
  const col = colOf(cell)
  const result: number[] = []
  const add = (r: number, c: number) => {
    if (r < 0 || r >= ROWS || c < 0 || c >= rowWidth(r, parity)) return
    result.push(r * COLS + c)
  }
  add(row, col - 1)
  add(row, col + 1)
  // A shifted row sits half a bubble to the right: its neighbours above / below are the
  // columns `col` and `col + 1`; an unshifted row's are `col - 1` and `col`.
  const left = isShifted(row, parity) ? col : col - 1
  for (const r of [row - 1, row + 1]) {
    add(r, left)
    add(r, left + 1)
  }
  return result
}

export const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)
