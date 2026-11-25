/** Types shared by `WaterSortBoard.vue` and its play view (kept out of the SFC for type-aware tools). */
export interface Pour {
  /** Source tube; when given (a real pour, not an undo), the pour is animated. */
  from?: number
  to: number
  amount: number
  /** Unique per pour (restarts the animation). */
  key: number
}
