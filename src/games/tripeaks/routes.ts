import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  { path: '/tripeaks', name: 'tripeaks', component: () => import('./TriPeaksLobby.vue') },
  { path: '/tripeaks/play', name: 'tripeaks-play', component: () => import('./TriPeaksPlay.vue') },
]
