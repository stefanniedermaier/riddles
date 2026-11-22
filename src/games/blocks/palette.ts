/**
 * Block colours 1 … 7 (index 0 unused = empty). Vivid in both themes; the bevel of the
 * blocks keeps them readable on light and dark boards.
 */
export const BLOCK_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7']

export const blockColor = (color: number): string => BLOCK_COLORS[color] ?? BLOCK_COLORS[1]!
