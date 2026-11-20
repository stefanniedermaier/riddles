/**
 * Which games are shown and in which order (Settings → Games). Drives the home screen, the
 * statistics and the game sections in the settings. Persisted under `riddles:gameLayout:v1`.
 */
import { computed } from 'vue'

import { usePersistentRef } from '@/core/storage'
import { games } from './registry'
import type { GameDescriptor, GameId } from './types'

export interface GameLayout {
  /** All known games in display order. */
  order: GameId[]
  /** Hidden games (subset of `order`; at least one game always stays enabled). */
  disabled: GameId[]
}

const knownIds = (): GameId[] => games.map((game) => game.id)

/**
 * Repairs a stored layout: drops unknown and duplicate ids, appends games added in an update
 * (enabled) and makes sure at least one game is enabled.
 */
export function normalizeLayout(raw: unknown, known: readonly GameId[] = knownIds()): GameLayout {
  const input = typeof raw === 'object' && raw !== null ? (raw as Partial<GameLayout>) : {}
  const isKnown = (id: unknown): id is GameId => known.includes(id as GameId)

  const order: GameId[] = []
  for (const id of Array.isArray(input.order) ? input.order : []) {
    if (isKnown(id) && !order.includes(id)) order.push(id)
  }
  for (const id of known) if (!order.includes(id)) order.push(id)

  let disabled = (Array.isArray(input.disabled) ? input.disabled : []).filter(
    (id, index, list): id is GameId => isKnown(id) && list.indexOf(id) === index,
  )
  if (disabled.length >= order.length) disabled = disabled.filter((id) => id !== order[0])
  return { order, disabled }
}

export const gameLayout = usePersistentRef<GameLayout>('gameLayout:v1', normalizeLayout(null), {
  parse: (raw) => normalizeLayout(raw),
})

const byId = new Map(games.map((game) => [game.id, game]))

/** All games in the user's order. */
export const orderedGames = computed<GameDescriptor[]>(() =>
  gameLayout.value.order.map((id) => byId.get(id)!),
)

/** Enabled games in the user's order (home screen, statistics, settings sections). */
export const visibleGames = computed<GameDescriptor[]>(() =>
  orderedGames.value.filter((game) => !gameLayout.value.disabled.includes(game.id)),
)

export function isGameEnabled(id: GameId): boolean {
  return !gameLayout.value.disabled.includes(id)
}

/** Enables or disables a game; the last enabled game cannot be disabled. */
export function setGameEnabled(id: GameId, enabled: boolean): void {
  const { disabled, order } = gameLayout.value
  if (enabled) {
    gameLayout.value = { order, disabled: disabled.filter((other) => other !== id) }
  } else if (!disabled.includes(id) && order.length - disabled.length > 1) {
    gameLayout.value = { order, disabled: [...disabled, id] }
  }
}

/** Moves a game to another position (0-based, clamped). */
export function moveGame(id: GameId, toIndex: number): void {
  const order = gameLayout.value.order.filter((other) => other !== id)
  const index = Math.max(0, Math.min(order.length, toIndex))
  order.splice(index, 0, id)
  gameLayout.value = { ...gameLayout.value, order }
}
