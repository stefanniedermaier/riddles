import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  { path: '/freecell', name: 'freecell', component: () => import('./FreeCellLobby.vue') },
  { path: '/freecell/play', name: 'freecell-play', component: () => import('./FreeCellPlay.vue') },
]
