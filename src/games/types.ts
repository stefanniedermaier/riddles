import type { Component } from 'vue'

import type { GameId } from './modules'

/** Id of a game, derived from the module list in `modules.ts`. */
export type { GameId }

/**
 * What the app shell needs to know about a game. Each game exports one from
 * `src/games/<id>/index.ts`; its `module.ts` bundles it with routes and texts.
 *
 * Display name and tagline come from the i18n keys `<id>.name` and `<id>.tagline`.
 */
export interface GameDescriptor {
  id: GameId
  /** Difficulties or modes, used as statistics variants. */
  variants: readonly string[]
  /** Whether statistics show times (puzzles) or scores. */
  /** `both`: card games record time and points (the scoring setting picks what is shown). */
  statKind: 'time' | 'score' | 'both'
  /** Human readable label of a variant (already translated). */
  variantLabel: (variant: string) => string
  /** `true` if there is a game that can be continued. */
  hasSavedGame: () => boolean
  /** Optional settings section rendered in the settings view. */
  settingsComponent?: () => Promise<Component | { default: Component }>
}
