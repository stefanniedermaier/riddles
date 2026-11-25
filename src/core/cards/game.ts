/**
 * The contract between a patience game's rules and the shared play view, solver and
 * persistence: a game is a pure state machine `deal → apply(move) → …`.
 *
 * A running game is stored as its seed, variant and move list; the state is rebuilt by
 * replaying the moves (`replay`). Undo replays all but the last move.
 */
/** Storage key of a card game's running game (`<id>:current:v1`). */
export function cardSaveKey(gameId: string): string {
  return `${gameId}:current:v1`
}

export interface Applied<S> {
  state: S
  /** Points of this move in points mode (may be negative). */
  points: number
}

export interface CardRules<S, M, V extends string = string> {
  variants: readonly V[]
  deal(variant: V, seed: number): S
  /** The state after a legal move, or null if the move is not allowed. */
  apply(state: S, move: M): Applied<S> | null
  isWon(state: S): boolean
  /**
   * Candidate moves for the solver, best first. May leave out useless moves but must keep
   * every move needed to win. A forced move may be returned alone.
   */
  solverMoves(state: S): M[]
  /** Canonical key of a state (equal for states that play the same). */
  key(state: S): string
  isMove(value: unknown): value is M
}

/** Points-mode constants shared by all card games. */
export const UNDO_COST = 2
export const HINT_COST = 20
export const WIN_BONUS = 500
/** Time bonus at a win: fast games pay, slow ones still get the base bonus. */
export const timeBonus = (ms: number): number => Math.max(0, 900 - Math.floor(ms / 1000))

export interface Replayed<S> {
  state: S
  points: number
}

/** Rebuilds a game from its deal and moves; null if a move is illegal (corrupt save). */
export function replay<S, M, V extends string>(
  rules: CardRules<S, M, V>,
  variant: V,
  seed: number,
  moves: readonly M[],
): Replayed<S> | null {
  let state = rules.deal(variant, seed)
  let points = 0
  for (const move of moves) {
    const next = rules.apply(state, move)
    if (!next) return null
    state = next.state
    points += next.points
  }
  return { state, points }
}

/** The displayed score: move points minus undo and hint costs, never below 0. */
export function scoreOf(points: number, undos: number, hints: number, bonus = 0): number {
  return Math.max(0, points - undos * UNDO_COST - hints * HINT_COST + bonus)
}
