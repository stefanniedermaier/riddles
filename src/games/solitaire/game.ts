/**
 * Solitaire (Klondike) for the shared card view.
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
  VARIANT_RULES,
  autoFinish,
  canPick,
  dropMove,
  recyclesLeft,
  rules,
  tapMove,
  type Move,
  type State,
  type Variant,
} from './logic/rules'

export const settings = useGameSettings<CardSettings>('solitaire', {
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
  key: 'solitaire:pool:v1',
  generate: (variant, seed) => request({ kind: 'deal', variant, seed }) as Promise<{ seed: number }>,
  isValid: (raw): raw is { seed: number } => Number.isInteger((raw as { seed?: unknown })?.seed),
})

const variantLabel = (variant: Variant): string => t(`solitaire.variants.${variant}`)

/** Wide layout: stock and waste left of the columns, the foundations in a 2 × 2 block right. */
const WIDE_TABLEAU_X = 1.7
const WIDE_FOUNDATION_X = 8.9

function layout(state: State, wide: boolean): PileView[] {
  const left = recyclesLeft(state)
  const piles: PileView[] = [
    {
      id: 's',
      x: 0,
      y: 0,
      slots: state.s,
      fan: 'none',
      placeholder: state.w.length && left > 0 ? '↻' : '',
      label: state.s.length
        ? t('cards.pileCount', { pile: pileName('s'), count: state.s.length })
        : state.w.length && left > 0
          ? t('cards.stockTurn')
          : t('cards.stockDone'),
    },
    {
      id: 'w',
      x: wide ? 0 : 1,
      y: wide ? 1 : 0,
      slots: state.w,
      fan: VARIANT_RULES[state.variant].draw === 3 ? 'right' : 'none',
      label: pileLabel(DECK, 'w', state.w),
    },
    ...state.f.map((pile, i) => ({
      id: `f${i}`,
      x: wide ? WIDE_FOUNDATION_X + (i % 2) : 3 + i,
      y: wide ? Math.floor(i / 2) : 0,
      slots: pile,
      fan: 'none' as const,
      placeholder: 'A',
      label: pileLabel(DECK, `f${i}`, pile),
    })),
    ...state.t.map((pile, i) => ({
      id: `t${i}`,
      x: wide ? WIDE_TABLEAU_X + i : i,
      y: wide ? 0 : 1,
      slots: pile,
      fan: 'down' as const,
      placeholder: 'K',
      label: pileLabel(DECK, `t${i}`, pile),
    })),
  ]
  return piles
}

function topOf(state: State, move: Extract<Move, { k: 'move' }>): number {
  if (move.from === 'w') return state.w[state.w.length - 1]!
  if (move.from[0] === 'f') return state.f[Number(move.from[1])]!.at(-1)!
  const pile = state.t[Number(move.from[1])]!
  return pile[pile.length - move.n]!
}

export const solitaire: CardGameDef<State, Move, Variant> = {
  id: 'solitaire',
  rules,
  deck: () => DECK,
  columns: 7,
  wideColumns: WIDE_FOUNDATION_X + 2,
  layout,
  canPick,
  dropMove,
  tapMove,
  autoFinish,
  hud: (state) => {
    const limit = VARIANT_RULES[state.variant].recycles
    return Number.isFinite(limit)
      ? [{ label: t('cards.play.passesLeft'), value: String(Math.max(0, recyclesLeft(state)) + (state.s.length ? 1 : 0)) }]
      : []
  },
  describe: (state, move) =>
    move.k === 'draw'
      ? t('cards.play.hintDeal')
      : move.k === 'recycle'
        ? t('cards.play.hintRecycle')
        : t('cards.play.hintMove', { card: cardName(DECK, topOf(state, move)), pile: pileName(move.to) }),
  pilesOf: (move) => (move.k === 'move' ? [move.from, move.to] : ['s']),
  deal: async (variant, solvable) =>
    solvable && variant !== 'draw1-1pass' ? (await pool.take(variant)).seed : randomSeed(),
  warm: () => settings.value.solvable && pool.warm(VARIANTS.filter((v) => v !== 'draw1-1pass')),
  plan: async (variant, seed, moves) => {
    const result = (await request({ kind: 'plan', variant, seed, moves: [...moves] })) as { moves: Move[] | null }
    return result.moves
  },
  settings,
  options: ['solvable', 'tapAuto', 'fourColor'],
  variantLabel,
  rulesKeys: ['solitaire.rules.goal', 'solitaire.rules.tableau', 'solitaire.rules.stock', 'solitaire.rules.passes'],
}
