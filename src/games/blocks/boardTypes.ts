/** Types shared by `BlocksBoard.vue` and its play view (kept out of the SFC for type-aware tools). */
export interface Ghost {
  cells: readonly number[]
  color: number
}

export interface ClearingBlock {
  cell: number
  color: number
  /** Animation delay in ms (blocks vanish one after another along the line). */
  delay: number
}
