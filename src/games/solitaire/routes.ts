import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'solitaire',
  () => import('./SolitaireLobby.vue'),
  () => import('./SolitairePlay.vue'),
)
