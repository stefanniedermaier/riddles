/**
 * Spider for the shared card view.
 */
import { cardName, pileLabel, pileName } from '@/components/cards/labels'
import type { CardGameDef, CardSettings, PileView } from '@/components/cards/types'
import { faceDown } from '@/core/cards/cards'
import type { CardRequest, CardResponse } from '@/core/cards/worker'
import { t } from '@/core/i18n'
import { createPuzzlePool } from '@/core/pool'
import { randomSeed } from '@/core/rng'
import { useGameSettings } from '@/core/settings'
import { createWorkerClient } from '@/core/worker'
import {
  DECKS,
  START_POINTS,
  VARIANTS,
  canPick,
  dropMove,
  rules,
  tapMove,
  type Move,
  type State,
  type Variant,
} from './logic/rules'

const settings = useGameSettings<CardSettings>('spider', {
  scoring: 'time',
  solvable: true,
  tapAuto: true,
  fourColor: false,
  autoFoundation: false,
})

const request = createWorkerClient<CardRequest, CardResponse>(
  () => new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' }),
  () => import('./logic/handler').then((module) => module.handle),
)

const pool = createPuzzlePool<Variant, { seed: number }>({
  key: 'spider:pool:v1',
  generate: (variant, seed) => request({ kind: 'deal', variant, seed }) as Promise<{ seed: number }>,
  isValid: (raw): raw is { seed: number } => Number.isInteger((raw as { seed?: unknown })?.seed),
})

const variantLabel = (variant: Variant): string => t(`spider.variants.${variant}`)

/** Wide layout: completed runs left of the columns, the stock right. */
const WIDE_TABLEAU_X = 1.2
const WIDE_STOCK_X = 11.4

function layout(state: State, wide: boolean): PileView[] {
  const deck = DECKS[state.variant]
  return [
    {
      id: 'f0',
      x: 0,
      y: 0,
      slots: state.done,
      fan: 'none',
      placeholder: 'K',
      label: t('spider.play.runsLabel', { n: state.done.length }),
    },
    {
      id: 's',
      x: wide ? WIDE_STOCK_X : 9,
      y: 0,
      slots: state.s.map(faceDown),
      fan: 'none',
      label: state.s.length ? t('spider.play.stockLabel', { n: state.s.length / 10 }) : t('cards.stockDone'),
    },
    ...state.t.map((pile, i) => ({
      id: `t${i}`,
      x: wide ? WIDE_TABLEAU_X + i : i,
      y: wide ? 0 : 1,
      slots: pile,
      fan: 'down' as const,
      label: pileLabel(deck, `t${i}`, pile),
    })),
  ]
}

export const spider: CardGameDef<State, Move, Variant> = {
  id: 'spider',
  rules,
  deck: (variant) => DECKS[variant],
  columns: 10,
  wideColumns: WIDE_STOCK_X + 1,
  layout,
  canPick,
  dropMove,
  tapMove,
  startPoints: START_POINTS,
  hud: (state) => [
    { label: t('spider.play.runs'), value: `${state.done.length} / 8` },
    { label: t('spider.play.deals'), value: String(state.s.length / 10) },
  ],
  describe: (state, move) => {
    if (move.k === 'deal') return t('cards.play.hintDeal')
    const pile = state.t[Number(move.from.slice(1))]!
    return t('cards.play.hintMove', {
      card: cardName(DECKS[state.variant], pile[pile.length - move.n]!),
      pile: pileName(move.to),
    })
  },
  pilesOf: (move) => (move.k === 'deal' ? ['s'] : [move.from, move.to]),
  deal: async (variant, solvable) => (solvable ? (await pool.take(variant)).seed : randomSeed()),
  warm: () => settings.value.solvable && pool.warm(VARIANTS),
  plan: async (variant, seed, moves) =>
    ((await request({ kind: 'plan', variant, seed, moves: [...moves] })) as { moves: Move[] | null }).moves,
  settings,
  options: ['solvable', 'tapAuto', 'fourColor'],
  variantLabel,
  rulesKeys: ['spider.rules.goal', 'spider.rules.build', 'spider.rules.runs', 'spider.rules.deal', 'spider.rules.fourSuits'],
}
