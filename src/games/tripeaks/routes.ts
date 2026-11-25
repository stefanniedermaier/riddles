import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'tripeaks',
  () => import('./TriPeaksLobby.vue'),
  () => import('./TriPeaksPlay.vue'),
)
