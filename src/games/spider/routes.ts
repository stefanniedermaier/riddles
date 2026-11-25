import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'spider',
  () => import('./SpiderLobby.vue'),
  () => import('./SpiderPlay.vue'),
)
