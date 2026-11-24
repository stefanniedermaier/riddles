import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/pipes',
    name: 'pipes',
    component: () => import('./PipesLobby.vue'),
  },
  {
    path: '/pipes/play',
    name: 'pipes-play',
    component: () => import('./PipesPlay.vue'),
  },
]
