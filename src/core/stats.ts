/**
 * Local statistics per game and variant (difficulty or mode).
 * Persisted under `riddles:stats:v1`.
 */
import { usePersistentRef } from './storage'

export interface VariantStats {
  /** Games started. */
  started: number
  /** Puzzles solved / runs completed. */
  finished: number
  /** Fastest solve (puzzles). */
  bestTimeMs?: number
  /** Sum of all solve times, for the average (puzzles). */
  totalTimeMs: number
  /** Highest score (score-based games). */
  bestScore?: number
  /** Sum of all recorded scores and their count, for the average (score-based games). */
  totalScore?: number
  scoredRuns?: number
  /** ISO timestamp of the last start or finish. */
  lastPlayedAt?: string
}

type StatsStore = Record<string, Record<string, VariantStats>>

const store = usePersistentRef<StatsStore>('stats:v1', {}, {
  parse: (raw) => (typeof raw === 'object' && raw !== null ? (raw as StatsStore) : undefined),
})

function emptyStats(): VariantStats {
  return { started: 0, finished: 0, totalTimeMs: 0 }
}

function entry(gameId: string, variant: string): VariantStats {
  const game = (store.value[gameId] ??= {})
  return (game[variant] ??= emptyStats())
}

// ---------------------------------------------------------------------------
// Activity: the days on which anything was played (for "days played" and day streaks).

/** Local calendar day as `YYYY-MM-DD`. */
export function dayKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** At most this many distinct days are kept (oldest dropped). */
const MAX_ACTIVITY_DAYS = 400

const activity = usePersistentRef<string[]>('activity:v1', [], {
  parse: (raw) =>
    Array.isArray(raw) ? raw.filter((d): d is string => /^\d{4}-\d{2}-\d{2}$/.test(String(d))) : undefined,
})

function markActive(): void {
  const today = dayKey()
  if (activity.value.includes(today)) return
  activity.value = [...activity.value, today].sort().slice(-MAX_ACTIVITY_DAYS)
}

export interface ActivitySummary {
  /** Number of distinct days with at least one game. */
  activeDays: number
  /** Consecutive days up to today (or up to yesterday if nothing was played today yet). */
  currentStreak: number
  /** Longest run of consecutive days. */
  bestStreak: number
}

/** Pure helper: summary for a list of `YYYY-MM-DD` days. */
export function summarizeActivity(days: readonly string[], today: string = dayKey()): ActivitySummary {
  const sorted = [...new Set(days)].sort()
  const toNumber = (day: string) => Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) / 86_400_000
  let best = 0
  let run = 0
  let previous: number | undefined
  for (const day of sorted) {
    const n = toNumber(day)
    run = previous !== undefined && n - previous === 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = n
  }
  let current = 0
  const last = sorted.length > 0 ? toNumber(sorted[sorted.length - 1]!) : undefined
  const todayN = toNumber(today)
  if (last !== undefined && todayN - last <= 1) current = run
  return { activeDays: sorted.length, currentStreak: current, bestStreak: best }
}

export function getActivity(): ActivitySummary {
  return summarizeActivity(activity.value)
}

// ---------------------------------------------------------------------------

export function recordStart(gameId: string, variant: string): void {
  const stats = entry(gameId, variant)
  stats.started += 1
  stats.lastPlayedAt = new Date().toISOString()
  markActive()
}

export interface FinishResult {
  newBestTime: boolean
  newBestScore: boolean
}

export function recordFinish(
  gameId: string,
  variant: string,
  result: { timeMs?: number; score?: number },
): FinishResult {
  const stats = entry(gameId, variant)
  stats.finished += 1
  stats.lastPlayedAt = new Date().toISOString()
  markActive()

  let newBestTime = false
  let newBestScore = false
  if (result.timeMs !== undefined) {
    stats.totalTimeMs += result.timeMs
    if (stats.bestTimeMs === undefined || result.timeMs < stats.bestTimeMs) {
      // Only a "new best" if there was a previous best to beat.
      newBestTime = stats.bestTimeMs !== undefined
      stats.bestTimeMs = result.timeMs
    }
  }
  if (result.score !== undefined) {
    stats.totalScore = (stats.totalScore ?? 0) + result.score
    stats.scoredRuns = (stats.scoredRuns ?? 0) + 1
    if (stats.bestScore === undefined || result.score > stats.bestScore) {
      newBestScore = stats.bestScore !== undefined && result.score > 0
      stats.bestScore = result.score
    }
  }
  return { newBestTime, newBestScore }
}

/** Reactive stats of one game (read-only use). */
export function getStats(gameId: string): Record<string, VariantStats> {
  return store.value[gameId] ?? {}
}

export function getVariantStats(gameId: string, variant: string): VariantStats {
  return store.value[gameId]?.[variant] ?? emptyStats()
}

export function resetStats(gameId?: string): void {
  if (gameId) {
    delete store.value[gameId]
  } else {
    store.value = {}
    activity.value = []
  }
}
