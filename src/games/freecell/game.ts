/**
 * FreeCell for the shared card view.
 */
import { cardName, pileLabel, pileName } from '@/components/cards/labels'
import type { CardGameDef, CardSettings, PileView } from '@/components/cards/types'
import type { CardRequest, CardResponse } from '@/core/cards/worker'
import { t } from '@/core/i18n'
import { createPuzzlePool } from '@/core/pool'
import { randomSeed } from '@/core/rng'
import { useGameSettings } from '@/core/settings'
import { createWorkerClient } from '@/core/worker'
import {
  DECK,
  VARIANTS,
  autoFinish,
  canPick,
  dropMove,
  rules,
  safeMove,
  tapMove,
  type Move,
  type State,
  type Variant,
} from './logic/rules'

export const settings = useGameSettings<CardSettings>('freecell', {
  scoring: 'time',
  solvable: true,
  tapAuto: true,
  fourColor: false,
  autoFoundation: true,
})

const request = createWorkerClient<CardRequest, CardResponse>(
  () => new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' }),
  () => import('./logic/handler').then((module) => module.handle),
)

const pool = createPuzzlePool<Variant, { seed: number }>({
  key: 'freecell:pool:v1',
  generate: (variant, seed) => request({ kind: 'deal', variant, seed }) as Promise<{ seed: number }>,
  isValid: (raw): raw is { seed: number } => Number.isInteger((raw as { seed?: unknown })?.seed),
})

const variantLabel = (variant: Variant): string => t(`freecell.variants.${variant}`)

function layout(state: State): PileView[] {
  return [
    ...state.c.map((card, i) => ({
      id: `c${i}`,
      x: i,
      y: 0,
      slots: card >= 0 ? [card] : [],
      fan: 'none' as const,
      label: pileLabel(DECK, `c${i}`, card >= 0 ? [card] : []),
    })),
    ...state.f.map((pile, i) => ({
      id: `f${i}`,
      x: 4 + i,
      y: 0,
      slots: pile,
      fan: 'none' as const,
      placeholder: 'A',
      label: pileLabel(DECK, `f${i}`, pile),
    })),
    ...state.t.map((pile, i) => ({
      id: `t${i}`,
      x: i,
      y: 1,
      slots: pile,
      fan: 'down' as const,
      label: pileLabel(DECK, `t${i}`, pile),
    })),
  ]
}

function firstCard(state: State, move: Move): number {
  if (move.from[0] === 'c') return state.c[Number(move.from[1])]!
  const pile = state.t[Number(move.from[1])]!
  return pile[pile.length - move.n]!
}

export const freecell: CardGameDef<State, Move, Variant> = {
  id: 'freecell',
  rules,
  deck: () => DECK,
  columns: 8,
  layout,
  canPick,
  dropMove,
  tapMove,
  autoFinish,
  autoMoves: (state, current) => {
    if (!current.autoFoundation) return []
    const moves: Move[] = []
    let next = state
    for (let move = safeMove(next); move; move = safeMove(next)) {
      moves.push(move)
      next = rules.apply(next, move)!.state
    }
    return moves
  },
  hud: (state) => [
    { label: t('freecell.play.cells'), value: `${state.c.filter((c) => c < 0).length} / ${state.c.length}` },
  ],
  describe: (state, move) =>
    t('cards.play.hintMove', { card: cardName(DECK, firstCard(state, move)), pile: pileName(move.to) }),
  pilesOf: (move) => [move.from, move.to],
  deal: async (variant, solvable) => (solvable ? (await pool.take(variant)).seed : randomSeed()),
  warm: () => settings.value.solvable && pool.warm(VARIANTS),
  plan: async (variant, seed, moves) =>
    ((await request({ kind: 'plan', variant, seed, moves: [...moves] })) as { moves: Move[] | null }).moves,
  settings,
  options: ['solvable', 'tapAuto', 'autoFoundation', 'fourColor'],
  variantLabel,
  rulesKeys: ['freecell.rules.goal', 'freecell.rules.tableau', 'freecell.rules.cells', 'freecell.rules.groups'],
}
