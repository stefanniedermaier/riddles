import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/nonogram',
    name: 'nonogram',
    component: () => import('./NonogramLobby.vue'),
  },
  {
    path: '/nonogram/play',
    name: 'nonogram-play',
    component: () => import('./NonogramPlay.vue'),
  },
]
