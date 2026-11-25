import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'crowns',
  () => import('./CrownsLobby.vue'),
  () => import('./CrownsPlay.vue'),
)
