/** Types shared by `MergeBoard.vue` and its play view (kept out of the SFC for type-aware tools). */
export interface DisplayTile {
  id: number
  value: number
  cell: number
  /** `new`: just spawned, `merged`: created by a merge in the last move. */
  state: 'normal' | 'new' | 'merged'
}
