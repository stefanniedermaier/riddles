import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'arrows',
  () => import('./ArrowsLobby.vue'),
  () => import('./ArrowsPlay.vue'),
)
