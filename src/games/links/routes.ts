import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/links',
    name: 'links',
    component: () => import('./LinksLobby.vue'),
  },
  {
    path: '/links/play',
    name: 'links-play',
    component: () => import('./LinksPlay.vue'),
  },
]
