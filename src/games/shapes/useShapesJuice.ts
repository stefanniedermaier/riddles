/**
 * The "juice" of the Shapes play view: points flying from cleared pieces to the score,
 * praise words for cascades and big clears, and a board shake for bombs and rockets.
 * Purely visual – the run itself never waits for any of it.
 */
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

import { formatNumber } from '@/core/format'
import { motionEnabled } from '@/core/theme'
import type { BoardEffect } from './animator'

export interface Flight {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  text: string
}

/** How long points fly to the score. */
const FLY_MS = 650

const PRAISE = ['good', 'great', 'amazing', 'incredible'] as const
type Praise = (typeof PRAISE)[number]

const SHAKE_STRONG: Keyframe[] = [
  { transform: 'translate(0, 0)' },
  { transform: 'translate(-6px, 3px) rotate(-0.6deg)' },
  { transform: 'translate(5px, -4px) rotate(0.5deg)' },
  { transform: 'translate(-4px, 2px)' },
  { transform: 'translate(2px, -1px)' },
  { transform: 'translate(0, 0)' },
]
const SHAKE_LIGHT: Keyframe[] = [
  { transform: 'translate(0, 0)' },
  { transform: 'translate(-2px, 1px)' },
  { transform: 'translate(2px, -1px)' },
  { transform: 'translate(0, 0)' },
]

export function useShapesJuice(options: {
  /** Wraps the board: flights start there, the shake moves it. */
  boardWrap: Ref<HTMLElement | null>
  /** The shown score (counts up as points land) and the real one (its cap). */
  displayScore: Ref<number>
  realScore: () => number
  /** Effects of the board animator (bombs, rockets …). */
  effects: Ref<readonly BoardEffect[]>
  /** Called when praise appears. */
  onPraise?: () => void
}) {
  const { boardWrap, displayScore, realScore, effects } = options

  // --- Points flying to the score ---------------------------------------------------------

  const flights = ref<Flight[]>([])
  const scoreBump = ref(0)
  let flightId = 1
  /** Changes with every new run (and on leaving), so old points never land in a new run. */
  let runToken = 0
  const timers = new Set<ReturnType<typeof setTimeout>>()

  function later(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
  }

  /** Adds points to the shown score without overtaking the real one. */
  function addShownScore(points: number): void {
    const cap = realScore()
    if (displayScore.value >= cap) return
    displayScore.value = Math.min(cap, displayScore.value + points)
    scoreBump.value++
  }

  function flyPoints(score: number, cells: number[]): void {
    if (score <= 0) return
    const board = boardWrap.value?.querySelector('.board')?.getBoundingClientRect()
    const target = document.querySelector('[data-score-target]')?.getBoundingClientRect()
    if (!motionEnabled.value || !board || !target || board.width === 0 || cells.length === 0) {
      addShownScore(score)
      return
    }
    const cell = board.width / 8
    const row = cells.reduce((sum, c) => sum + Math.floor(c / 8), 0) / cells.length
    const col = cells.reduce((sum, c) => sum + (c % 8), 0) / cells.length
    const x = board.left + (col + 0.5) * cell
    const y = board.top + (row + 0.5) * cell
    const id = flightId++
    const token = runToken
    flights.value = [
      ...flights.value,
      {
        id,
        x,
        y,
        dx: target.left + target.width / 2 - x,
        dy: target.top + target.height / 2 - y,
        text: `+${formatNumber(score)}`,
      },
    ]
    later(() => {
      flights.value = flights.value.filter((flight) => flight.id !== id)
      if (token === runToken) addShownScore(score)
    }, FLY_MS)
  }

  /** Once the points of a move have landed, the shown score is exact again. */
  function settleScore(isOver: () => boolean): void {
    const token = runToken
    later(() => {
      if (token === runToken && !isOver()) displayScore.value = realScore()
    }, FLY_MS + 50)
  }

  /** A new run: points still in the air are dropped. */
  function resetForRun(): void {
    runToken++
    flights.value = []
  }

  // --- Praise ---------------------------------------------------------------------------------

  const praise = ref<{ id: number; word: Praise } | null>(null)
  let praiseId = 1
  let praiseTimer: ReturnType<typeof setTimeout> | undefined

  function showPraise(word: Praise): void {
    if (!motionEnabled.value) return
    clearTimeout(praiseTimer)
    options.onPraise?.()
    praise.value = { id: praiseId++, word }
    praiseTimer = setTimeout(() => (praise.value = null), 1100)
  }

  /**
   * Tracks the clears of one move: the 2nd, 3rd, 4th and 5th cascade (or a very big single
   * clear) earn an ever bigger word. Each word is shown at most once per move.
   */
  function praiseTracker(): (cells: number[]) => void {
    let clears = 0
    let shown = -1
    return (cells) => {
      clears++
      let tier = Math.min(clears, 5) - 2
      if (cells.length >= 10) tier = Math.max(tier, 1)
      if (cells.length >= 16) tier = Math.max(tier, 2)
      if (cells.length >= 24) tier = Math.max(tier, 3)
      if (tier > shown) {
        shown = tier
        showPraise(PRAISE[tier]!)
      }
    }
  }

  // --- Board shake ------------------------------------------------------------------------------

  let lastEffectId = 0

  watch(effects, (list) => {
    const fresh = list.filter((effect) => effect.id > lastEffectId)
    if (fresh.length === 0) return
    lastEffectId = Math.max(...fresh.map((effect) => effect.id))
    const el = boardWrap.value
    if (!el || typeof el.animate !== 'function' || !motionEnabled.value) return
    if (fresh.some((effect) => effect.type === 'burst' || effect.type === 'prism')) {
      el.animate(SHAKE_STRONG, { duration: 380, easing: 'ease-out' })
    } else if (fresh.some((effect) => effect.type === 'line-h' || effect.type === 'line-v')) {
      el.animate(SHAKE_LIGHT, { duration: 200, easing: 'ease-out' })
    }
  })

  onBeforeUnmount(() => {
    runToken++
    clearTimeout(praiseTimer)
    for (const id of timers) clearTimeout(id)
  })

  return { flights, scoreBump, praise, flyPoints, settleScore, resetForRun, praiseTracker }
}
