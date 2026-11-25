import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  { path: '/solitaire', name: 'solitaire', component: () => import('./SolitaireLobby.vue') },
  { path: '/solitaire/play', name: 'solitaire-play', component: () => import('./SolitairePlay.vue') },
]
