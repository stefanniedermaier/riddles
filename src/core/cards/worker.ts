/**
 * Worker requests shared by the card games: find a solvable deal, and find a solution from
 * the current position (hints). Each game's `generator.worker.ts` exposes `cardHandler(rules)`.
 */
import { hashSeed } from '../rng'
import { replay, type CardRules } from './game'
import { solve } from './solver'

export type CardRequest =
  | { kind: 'deal'; variant: string; seed: number }
  | { kind: 'plan'; variant: string; seed: number; moves: unknown[] }

export type CardResponse = { seed: number } | { moves: unknown[] | null }

export interface HandlerOptions {
  /** Solver node budget per deal. */
  budget: number
  /** Deals tried before one is accepted without a proof (e.g. Spider with four suits). */
  attempts: (variant: string) => number
}

export function cardHandler<S, M, V extends string>(rules: CardRules<S, M, V>, options: HandlerOptions) {
  return (request: CardRequest): CardResponse => {
    const variant = request.variant as V
    if (!rules.variants.includes(variant)) throw new Error('unknown variant')
    if (request.kind === 'deal') {
      const attempts = options.attempts(variant)
      let seed = request.seed
      for (let attempt = 0; attempt < attempts; attempt++) {
        seed = hashSeed('deal', request.seed, attempt) % 2_000_000_000
        if (solve(rules, rules.deal(variant, seed), options.budget).moves) return { seed }
      }
      return { seed }
    }
    if (!request.moves.every((move) => rules.isMove(move))) throw new Error('bad moves')
    const current = replay(rules, variant, request.seed, request.moves)
    if (!current) return { moves: null }
    return { moves: solve(rules, current.state, options.budget).moves }
  }
}
