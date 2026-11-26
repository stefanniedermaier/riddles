/**
 * Obstacle layouts of the maze mode (17×17, `#` = stone). Original, symmetric, and the
 * start row (the middle one) is free from wall to wall, so the snake never starts facing a
 * stone. A test checks that all free cells are connected.
 */
export const MAZE_SIZE = 17

const LAYOUTS: readonly (readonly string[])[] = [
  // Corners: four brackets.
  [
    '.................',
    '.................',
    '..#####...#####..',
    '..#...........#..',
    '..#...........#..',
    '.................',
    '.................',
    '.................',
    '.................',
    '.................',
    '.................',
    '.................',
    '..#...........#..',
    '..#...........#..',
    '..#####...#####..',
    '.................',
    '.................',
  ],
  // Bars: two broken walls and two posts at the border.
  [
    '........#........',
    '........#........',
    '........#........',
    '.................',
    '...####...####...',
    '.................',
    '.................',
    '.................',
    '.................',
    '.................',
    '.................',
    '.................',
    '...####...####...',
    '.................',
    '........#........',
    '........#........',
    '........#........',
  ],
  // Pillars: six stones.
  [
    '.................',
    '.................',
    '.................',
    '...##..###..##...',
    '...##..###..##...',
    '.................',
    '.................',
    '.................',
    '.................',
    '.................',
    '.................',
    '.................',
    '...##..###..##...',
    '...##..###..##...',
    '.................',
    '.................',
    '.................',
  ],
]

export const MAZE_COUNT = LAYOUTS.length

const cache = new Map<number, readonly number[]>()

/** Cells (row * size + col) of the stones of a layout. */
export function mazeCells(layout: number): readonly number[] {
  let cells = cache.get(layout)
  if (!cells) {
    const rows = LAYOUTS[layout]
    if (!rows) throw new Error(`unknown maze layout ${layout}`)
    cells = rows.flatMap((row, r) => [...row].flatMap((char, c) => (char === '#' ? [r * MAZE_SIZE + c] : [])))
    cache.set(layout, cells)
  }
  return cells
}

/** The raw rows (for tests). */
export function mazeRows(layout: number): readonly string[] {
  return LAYOUTS[layout] ?? []
}
