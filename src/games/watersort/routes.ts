import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'watersort',
  () => import('./WaterSortLobby.vue'),
  () => import('./WaterSortPlay.vue'),
)
