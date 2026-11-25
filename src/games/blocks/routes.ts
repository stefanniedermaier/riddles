import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'blocks',
  () => import('./BlocksLobby.vue'),
  () => import('./BlocksPlay.vue'),
)
