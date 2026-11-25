import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'nonogram',
  () => import('./NonogramLobby.vue'),
  () => import('./NonogramPlay.vue'),
)
