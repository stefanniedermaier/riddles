import type { Component } from 'vue'

export type GameId = 'sudoku' | 'crowns' | 'links' | 'nonogram' | 'shapes' | 'merge'

/**
 * What the app shell needs to know about a game. Each game exports one from
 * `src/games/<id>/index.ts`; `registry.ts` collects them.
 *
 * Display name and tagline come from the i18n keys `<id>.name` and `<id>.tagline`.
 */
export interface GameDescriptor {
  id: GameId
  /** Difficulties or modes, used as statistics variants. */
  variants: readonly string[]
  /** Whether statistics show times (puzzles) or scores. */
  statKind: 'time' | 'score'
  /** Human readable label of a variant (already translated). */
  variantLabel: (variant: string) => string
  /** `true` if there is a game that can be continued. */
  hasSavedGame: () => boolean
  /** Optional settings section rendered in the settings view. */
  settingsComponent?: () => Promise<Component | { default: Component }>
}
