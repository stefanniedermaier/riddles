import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/arrows',
    name: 'arrows',
    component: () => import('./ArrowsLobby.vue'),
  },
  {
    path: '/arrows/play',
    name: 'arrows-play',
    component: () => import('./ArrowsPlay.vue'),
  },
]
