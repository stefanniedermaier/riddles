import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  { path: '/spider', name: 'spider', component: () => import('./SpiderLobby.vue') },
  { path: '/spider/play', name: 'spider-play', component: () => import('./SpiderPlay.vue') },
]
