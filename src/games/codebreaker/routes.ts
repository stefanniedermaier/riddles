import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/codebreaker',
    name: 'codebreaker',
    component: () => import('./CodeBreakerLobby.vue'),
  },
  {
    path: '/codebreaker/play',
    name: 'codebreaker-play',
    component: () => import('./CodeBreakerPlay.vue'),
  },
]
