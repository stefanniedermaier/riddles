/**
 * The life cycle of a puzzle game's play view, shared by the puzzle games:
 *
 * - start a new game (`?new=<variant>` in the route), resume the saved one, or go back to
 *   the lobby when there is neither;
 * - generation may be asynchronous (worker pools): a start that finishes after the player
 *   left or started something else is dropped;
 * - a game counts as started (statistics) and is saved only after the first action
 *   (`markStarted` / `saveProgress`); saved again on leaving, when hidden and every 5 s;
 * - the stopwatch (pauses while the app is hidden);
 * - win → statistics, save cleared, result dialog after a short delay;
 * - Ctrl/⌘+Z → `onUndo`; timers started with `later` are cleared when leaving.
 */
import { onBeforeUnmount, onMounted, ref, toRaw, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { GameId } from '@/games/types'
import { returnTo } from './navigation'
import type { SaveSlot } from './saveSlot'
import { recordFinish, recordStart } from './stats'
import { motionEnabled } from './theme'
import { useStopwatch } from './timer'

export type SessionStatus = 'loading' | 'playing' | 'won' | 'lost'

/** How a game came on screen. */
export type ShowReason = 'new' | 'restart' | 'resume'

export interface SessionResult {
  timeMs: number
  newBest: boolean
}

export interface PuzzleSessionOptions<S extends { elapsedMs: number }, V extends string> {
  gameId: GameId
  slot: SaveSlot<S>
  variants: readonly V[]
  /** Statistics variant of a game (its difficulty). */
  variantOf: (save: S) => V
  /** A fresh game for a variant; may wait for a worker. */
  create: (variant: V) => S | Promise<S>
  /** Called whenever a game comes on screen – reset view state here. May change `status`. */
  onShow?: (save: S, reason: ShowReason) => void
  /** Ctrl/⌘+Z. */
  onUndo?: () => void
  /** Statuses in which the game is saved (default: only while playing). */
  savedWhile?: readonly SessionStatus[]
  /** Delay before the result dialog opens (with motion). */
  resultDelayMs?: number
}

const AUTOSAVE_MS = 5000

export function usePuzzleSession<S extends { elapsedMs: number }, V extends string>(
  options: PuzzleSessionOptions<S, V>,
) {
  const { gameId, slot, variants, variantOf, create, onShow, onUndo } = options
  const savedWhile = options.savedWhile ?? ['playing']
  const route = useRoute()
  const router = useRouter()
  const playRoute = { name: `${gameId}-play` }
  const lobbyRoute = { name: gameId }

  const status = ref<SessionStatus>('loading')
  const game = ref(null) as Ref<S | null>
  const stopwatch = useStopwatch(0)
  const result = ref<SessionResult | null>(null)
  const showResult = ref(false)
  const showRules = ref(false)

  // --- Timers that belong to this view ---------------------------------------------------

  const timers = new Set<ReturnType<typeof setTimeout>>()

  /** Runs `fn` after `ms` unless the view is gone by then. */
  function later(fn: () => void, ms: number): void {
    const id = setTimeout(() => {
      timers.delete(id)
      fn()
    }, ms)
    timers.add(id)
  }

  // --- Started & saving -----------------------------------------------------------------

  let started = false

  /** The first action of a game: it now counts as started and gets saved. */
  function markStarted(): void {
    if (started || !game.value) return
    started = true
    recordStart(gameId, variantOf(game.value))
  }

  function persist(): void {
    const g = game.value
    if (!g || !started || !savedWhile.includes(status.value)) return
    slot.save({ ...toRaw(g), elapsedMs: Math.round(stopwatch.elapsedMs.value) })
  }

  /** After a player action: count the game as started and save it. */
  function saveProgress(): void {
    markStarted()
    persist()
  }

  // --- Showing a game ---------------------------------------------------------------------

  /** Bumped by every start and on leaving: a late generation result is dropped. */
  let startToken = 0

  function show(save: S, reason: ShowReason): void {
    game.value = save
    started = reason === 'resume'
    result.value = null
    showResult.value = false
    status.value = 'playing'
    stopwatch.reset(reason === 'resume' ? save.elapsedMs : 0)
    stopwatch.start()
    onShow?.(save, reason)
  }

  async function startNew(variant: V): Promise<void> {
    const token = ++startToken
    status.value = 'loading'
    result.value = null
    showResult.value = false
    stopwatch.reset(0)
    // The player chose a new game: the old save is gone. Drop ?new= before any await, so
    // the view never navigates after one (that could cancel a "back" tapped meanwhile).
    slot.clear()
    void router.replace(playRoute)
    const next = await create(variant)
    if (token !== startToken) return
    show(next, 'new')
  }

  /** Starts `fresh` (e.g. the same puzzle again) in place of the current game. */
  function restart(fresh: S): void {
    startToken++
    slot.clear()
    show(fresh, 'restart')
  }

  function resume(): boolean {
    const saved = slot.load()
    if (!saved) return false
    startToken++
    show(saved, 'resume')
    return true
  }

  // --- The end ------------------------------------------------------------------------------

  /** Solved: records the time, clears the save and opens the result dialog shortly after. */
  function win(): SessionResult | null {
    const g = game.value
    if (!g) return null
    stopwatch.pause()
    status.value = 'won'
    markStarted()
    const timeMs = Math.round(stopwatch.elapsedMs.value)
    const { newBestTime } = recordFinish(gameId, variantOf(g), { timeMs })
    slot.clear()
    result.value = { timeMs, newBest: newBestTime }
    openResultSoon()
    return result.value
  }

  /** Opens the result dialog after the end animation (right away without motion). */
  function openResultSoon(): void {
    later(() => (showResult.value = true), motionEnabled.value ? (options.resultDelayMs ?? 900) : 0)
  }

  function playAgain(): void {
    showResult.value = false
    const g = game.value
    void startNew(g ? variantOf(g) : variants[0]!)
  }

  function goToMenu(): void {
    showResult.value = false
    void returnTo(router, lobbyRoute)
  }

  function goHome(): void {
    showResult.value = false
    void returnTo(router, { name: 'home' })
  }

  // --- Life cycle ---------------------------------------------------------------------------

  function onVisibilityChange(): void {
    if (document.hidden) persist()
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!onUndo) return
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      onUndo()
    }
  }

  let autosave: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', persist)
    window.addEventListener('keydown', onKeydown)
    autosave = setInterval(persist, AUTOSAVE_MS)
  })

  onBeforeUnmount(() => {
    startToken++
    persist()
    clearInterval(autosave)
    for (const id of timers) clearTimeout(id)
    timers.clear()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', persist)
    window.removeEventListener('keydown', onKeydown)
  })

  /** Reads `?new=` (also when it changes while the view is open) or resumes. */
  function init(): void {
    watch(
      () => route.query.new,
      (value) => {
        if (typeof value === 'string' && (variants as readonly string[]).includes(value)) {
          void startNew(value as V)
        }
      },
      { immediate: true },
    )
    if (typeof route.query.new !== 'string' && !resume()) void router.replace(lobbyRoute)
  }

  return {
    status,
    game,
    stopwatch,
    result,
    showResult,
    showRules,
    later,
    markStarted,
    saveProgress,
    persist,
    startNew,
    restart,
    win,
    openResultSoon,
    playAgain,
    goToMenu,
    goHome,
    init,
  }
}
