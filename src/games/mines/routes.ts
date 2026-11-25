import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'mines',
  () => import('./MinesLobby.vue'),
  () => import('./MinesPlay.vue'),
)
