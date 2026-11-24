import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/watersort',
    name: 'watersort',
    component: () => import('./WaterSortLobby.vue'),
  },
  {
    path: '/watersort/play',
    name: 'watersort-play',
    component: () => import('./WaterSortPlay.vue'),
  },
]
