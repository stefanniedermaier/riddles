/**
 * Piece shapes. Cells are `[row, col]` offsets from the top-left corner of the piece's
 * bounding box. Pieces are never rotated – every orientation is its own shape.
 */
export type Cell = readonly [row: number, col: number]

export interface Shape {
  cells: readonly Cell[]
  /** Relative frequency when dealing. */
  weight: number
}

const shape = (weight: number, ...cells: Cell[]): Shape => ({ cells, weight })

export const SHAPES: readonly Shape[] = [
  // 1–2 cells
  shape(2, [0, 0]),
  shape(3, [0, 0], [0, 1]),
  shape(3, [0, 0], [1, 0]),
  // straight lines
  shape(3, [0, 0], [0, 1], [0, 2]),
  shape(3, [0, 0], [1, 0], [2, 0]),
  shape(3, [0, 0], [0, 1], [0, 2], [0, 3]),
  shape(3, [0, 0], [1, 0], [2, 0], [3, 0]),
  shape(1, [0, 0], [0, 1], [0, 2], [0, 3], [0, 4]),
  shape(1, [0, 0], [1, 0], [2, 0], [3, 0], [4, 0]),
  // squares and rectangles
  shape(4, [0, 0], [0, 1], [1, 0], [1, 1]),
  shape(1, [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]),
  shape(2, [0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]),
  shape(2, [0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]),
  // small corners
  shape(2, [0, 0], [1, 0], [1, 1]),
  shape(2, [0, 0], [0, 1], [1, 0]),
  shape(2, [0, 0], [0, 1], [1, 1]),
  shape(2, [0, 1], [1, 0], [1, 1]),
  // L shapes (4 cells)
  shape(1, [0, 0], [1, 0], [2, 0], [2, 1]),
  shape(1, [0, 1], [1, 1], [2, 1], [2, 0]),
  shape(1, [0, 0], [0, 1], [1, 0], [2, 0]),
  shape(1, [0, 0], [0, 1], [1, 1], [2, 1]),
  shape(1, [0, 0], [0, 1], [0, 2], [1, 0]),
  shape(1, [0, 0], [0, 1], [0, 2], [1, 2]),
  shape(1, [0, 0], [1, 0], [1, 1], [1, 2]),
  shape(1, [0, 2], [1, 0], [1, 1], [1, 2]),
  // T shapes
  shape(1, [0, 0], [0, 1], [0, 2], [1, 1]),
  shape(1, [0, 1], [1, 0], [1, 1], [1, 2]),
  shape(1, [0, 0], [1, 0], [2, 0], [1, 1]),
  shape(1, [0, 1], [1, 1], [2, 1], [1, 0]),
  // zigzags
  shape(1, [0, 1], [0, 2], [1, 0], [1, 1]),
  shape(1, [0, 0], [0, 1], [1, 1], [1, 2]),
  shape(1, [0, 0], [1, 0], [1, 1], [2, 1]),
  shape(1, [0, 1], [1, 0], [1, 1], [2, 0]),
  // big corners (5 cells)
  shape(1, [0, 0], [1, 0], [2, 0], [2, 1], [2, 2]),
  shape(1, [0, 0], [0, 1], [0, 2], [1, 0], [2, 0]),
  shape(1, [0, 0], [0, 1], [0, 2], [1, 2], [2, 2]),
  shape(1, [0, 2], [1, 2], [2, 0], [2, 1], [2, 2]),
]

/** Number of block colours (colour 1 … COLOR_COUNT; 0 = empty cell). */
export const COLOR_COUNT = 7

export function shapeSize(cells: readonly Cell[]): { rows: number; cols: number } {
  let rows = 0
  let cols = 0
  for (const [r, c] of cells) {
    rows = Math.max(rows, r + 1)
    cols = Math.max(cols, c + 1)
  }
  return { rows, cols }
}
