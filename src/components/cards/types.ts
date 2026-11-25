import type { GameId } from '@/games/types'
import type { Ref } from 'vue'

import type { CardDef, Slot } from '@/core/cards/cards'
import type { CardRules } from '@/core/cards/game'
import type { MessageKey } from '@/core/i18n'

/** One pile on the card table. */
export interface PileView {
  /** e.g. `t3`, `f0`, `w`, `s`, `c1`, `p17`. */
  id: string
  /** Position in card widths (x) and card rows (y). */
  x: number
  y: number
  slots: readonly Slot[]
  /** `down`: a tableau column; `right`: the last three cards spread (waste); `none`: stacked. */
  fan: 'none' | 'down' | 'right'
  /** Shown in an empty slot, e.g. "A", "K" or "↻". */
  placeholder?: string
  /** Accessible name of the pile, e.g. "Column 3: 5 cards". */
  label: string
}

export interface CardSettings extends Record<string, boolean | string> {
  scoring: 'time' | 'points'
  solvable: boolean
  tapAuto: boolean
  fourColor: boolean
  autoFoundation: boolean
}

interface HudItem {
  label: string
  value: string
}

/**
 * Everything the shared play view needs from one card game. `S` is the state, `M` a move,
 * `V` the variant.
 */
export interface CardGameDef<S, M, V extends string> {
  /** Game id (route names `<id>` and `<id>-play`, storage prefix, i18n namespace). */
  id: GameId
  rules: CardRules<S, M, V>
  deck(variant: V): readonly CardDef[]
  /** Width of the table in card widths. */
  columns: number
  /**
   * Width of the wide layout (landscape: stock and foundations beside the columns), if the
   * game has one. It is used when it gives larger cards than the normal layout.
   */
  wideColumns?: number
  layout(state: S, wide: boolean): PileView[]
  canPick(state: S, pile: string, index: number): boolean
  dropMove(state: S, from: string, index: number, to: string): M | null
  tapMove(state: S, pile: string, index: number): M | null
  /** Moves played automatically after each move (e.g. safe moves to the foundations). */
  autoMoves?(state: S, settings: CardSettings): M[]
  /** Moves that finish an obviously won game, or null. */
  autoFinish?(state: S): M[] | null
  /** The game is lost when no move is left (TriPeaks); otherwise "no moves" is only a hint. */
  endsWhenStuck?: boolean
  /** Points mode: start value and extra points at a win. */
  startPoints?: number
  winPoints?(state: S): number
  hud(state: S): HudItem[]
  /** Text for a move ("Move 7 of hearts to column 3"), for hints and announcements. */
  describe(state: S, move: M): string
  /** Piles a move touches (highlighted by a hint). */
  pilesOf(move: M): string[]
  /** A deal (seed) for a variant, checked by the solver when `solvable` is set. */
  deal(variant: V, solvable: boolean): Promise<number>
  /** Prefetch deals for the lobby (optional). */
  warm?(): void
  /** A solution from the current position (worker), or null. */
  plan(variant: V, seed: number, moves: readonly M[]): Promise<M[] | null>
  settings: Ref<CardSettings>
  /** Settings this game offers (others are hidden). */
  options: readonly ('solvable' | 'tapAuto' | 'fourColor' | 'autoFoundation')[]
  variantLabel(variant: V): string
  /** Rules texts (bullet points). */
  rulesKeys: readonly MessageKey[]
}
