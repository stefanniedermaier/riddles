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

export function recordStart(gameId: string, variant: string): void {
  const stats = entry(gameId, variant)
  stats.started += 1
  stats.lastPlayedAt = new Date().toISOString()
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
  }
}
