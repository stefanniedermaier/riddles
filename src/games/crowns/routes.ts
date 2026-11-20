import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/crowns',
    name: 'crowns',
    component: () => import('./CrownsLobby.vue'),
  },
  {
    path: '/crowns/play',
    name: 'crowns-play',
    component: () => import('./CrownsPlay.vue'),
  },
]
