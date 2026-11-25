import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'freecell',
  () => import('./FreeCellLobby.vue'),
  () => import('./FreeCellPlay.vue'),
)
