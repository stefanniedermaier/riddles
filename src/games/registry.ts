import type { RouteRecordRaw } from 'vue-router'

import { descriptor as crowns } from './crowns'
import { routes as crownsRoutes } from './crowns/routes'
import { descriptor as shapes } from './shapes'
import { routes as shapesRoutes } from './shapes/routes'
import { descriptor as sudoku } from './sudoku'
import { routes as sudokuRoutes } from './sudoku/routes'
import type { GameDescriptor, GameId } from './types'

/** All games in display order. */
export const games: readonly GameDescriptor[] = [sudoku, crowns, shapes]

export const gameRoutes: RouteRecordRaw[] = [...sudokuRoutes, ...crownsRoutes, ...shapesRoutes]

export function getGame(id: GameId): GameDescriptor {
  const game = games.find((candidate) => candidate.id === id)
  if (!game) throw new Error(`Unknown game ${id}`)
  return game
}
