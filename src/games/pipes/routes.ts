import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'pipes',
  () => import('./PipesLobby.vue'),
  () => import('./PipesPlay.vue'),
)
