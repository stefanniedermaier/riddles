import type { RouteRecordRaw } from 'vue-router'

import { gameModules } from './modules'
import type { GameDescriptor, GameId } from './types'

/** All games in default display order. */
export const games: readonly GameDescriptor[] = gameModules.map((module) => module.descriptor)

export const gameRoutes: RouteRecordRaw[] = gameModules.flatMap((module) => module.routes)

export function getGame(id: GameId): GameDescriptor {
  const game = games.find((candidate) => candidate.id === id)
  if (!game) throw new Error(`Unknown game ${id}`)
  return game
}
