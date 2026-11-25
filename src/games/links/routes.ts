import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'links',
  () => import('./LinksLobby.vue'),
  () => import('./LinksPlay.vue'),
)
