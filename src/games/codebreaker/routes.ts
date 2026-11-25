import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'codebreaker',
  () => import('./CodeBreakerLobby.vue'),
  () => import('./CodeBreakerPlay.vue'),
)
