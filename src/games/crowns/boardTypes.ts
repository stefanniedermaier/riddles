/** Types shared by `CrownsBoard.vue` and its play view (kept out of the SFC for type-aware tools). */
export interface BoardHighlight {
  /** Cells tinted as part of the explaining unit(s). */
  tint: ReadonlySet<number>
  /** Cells outlined. */
  focus: ReadonlySet<number>
  /** Preview of what applying the hint would change. */
  ghost: ReadonlyMap<number, 'mark' | 'crown'>
}
