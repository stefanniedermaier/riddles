/**
 * TriPeaks for the shared card view.
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
  DECK,
  POSITIONS,
  VARIANTS,
  apply,
  isFree,
  isRemoved,
  rules,
  winPoints,
  type Move,
  type State,
  type Variant,
} from './logic/rules'

export const settings = useGameSettings<CardSettings>('tripeaks', {
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
  key: 'tripeaks:pool:v1',
  generate: (variant, seed) => request({ kind: 'deal', variant, seed }) as Promise<{ seed: number }>,
  isValid: (raw): raw is { seed: number } => Number.isInteger((raw as { seed?: unknown })?.seed),
})

const variantLabel = (variant: Variant): string => t(`tripeaks.variants.${variant}`)

/** Wide layout: stock and waste right of the peaks, level with the bottom row. */
const WIDE_STOCK_X = 10.4
const BOTTOM_ROW_Y = 3 * 0.42

function layout(state: State, wide: boolean): PileView[] {
  const piles: PileView[] = []
  POSITIONS.forEach((position, i) => {
    if (isRemoved(state, i)) return
    const id = state.peaks[i]!
    const free = isFree(state, i)
    piles.push({
      id: `p${i}`,
      x: position.x,
      y: position.row * 0.42,
      slots: [free ? id : faceDown(id)],
      fan: 'none',
      label: free ? t('cards.pileTop', { pile: pileName('p'), card: cardName(DECK, id) }) : t('cards.faceDown'),
    })
  })
  piles.push(
    {
      id: 's',
      x: wide ? WIDE_STOCK_X : 3,
      y: wide ? BOTTOM_ROW_Y : 2.55,
      slots: state.s.map(faceDown),
      fan: 'none',
      label: state.s.length ? t('cards.pileCount', { pile: pileName('s'), count: state.s.length }) : t('cards.stockDone'),
    },
    { id: 'w', x: wide ? WIDE_STOCK_X + 1.1 : 5.5, y: wide ? BOTTOM_ROW_Y : 2.55, slots: state.w, fan: 'none', label: pileLabel(DECK, 'w', state.w) },
  )
  return piles
}

const peakIndex = (pile: string) => (pile[0] === 'p' ? Number(pile.slice(1)) : -1)

export const tripeaks: CardGameDef<State, Move, Variant> = {
  id: 'tripeaks',
  rules,
  deck: () => DECK,
  columns: 10,
  wideColumns: WIDE_STOCK_X + 2.1,
  layout,
  canPick: (state, pile) => peakIndex(pile) >= 0 && isFree(state, peakIndex(pile)),
  dropMove: (state, from, _index, to) => {
    const move: Move = { k: 'play', i: peakIndex(from) }
    return to === 'w' && apply(state, move) ? move : null
  },
  tapMove: (state, pile) => {
    const move: Move = pile === 's' ? { k: 'draw' } : { k: 'play', i: peakIndex(pile) }
    return apply(state, move) ? move : null
  },
  endsWhenStuck: true,
  winPoints,
  hud: (state) => [
    { label: t('tripeaks.play.streak'), value: String(state.streak) },
    { label: t('tripeaks.play.stock'), value: String(state.s.length) },
  ],
  describe: (state, move) =>
    move.k === 'draw'
      ? t('cards.play.hintDeal')
      : t('cards.play.hintMove', { card: cardName(DECK, state.peaks[move.i]!), pile: pileName('w') }),
  pilesOf: (move) => (move.k === 'draw' ? ['s'] : [`p${move.i}`, 'w']),
  deal: async (variant, solvable) => (solvable && variant !== 'hard' ? (await pool.take(variant)).seed : randomSeed()),
  warm: () => settings.value.solvable && pool.warm(VARIANTS.filter((v) => v !== 'hard')),
  plan: async (variant, seed, moves) =>
    ((await request({ kind: 'plan', variant, seed, moves: [...moves] })) as { moves: Move[] | null }).moves,
  settings,
  options: ['solvable', 'tapAuto', 'fourColor'],
  variantLabel,
  rulesKeys: ['tripeaks.rules.goal', 'tripeaks.rules.play', 'tripeaks.rules.stock', 'tripeaks.rules.wrap', 'tripeaks.rules.points'],
}
