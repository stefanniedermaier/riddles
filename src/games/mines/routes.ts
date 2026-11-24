import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/mines',
    name: 'mines',
    component: () => import('./MinesLobby.vue'),
  },
  {
    path: '/mines/play',
    name: 'mines-play',
    component: () => import('./MinesPlay.vue'),
  },
]
