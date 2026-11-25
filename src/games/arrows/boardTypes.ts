/** Types shared by `ArrowsBoard.vue` and its play view (kept out of the SFC for type-aware tools). */
export interface LeavingArrow {
  id: number
  /** Unique per animation run (restarts the CSS animation). */
  key: number
}

export interface Bump {
  arrow: number
  blocker: number
  key: number
}
