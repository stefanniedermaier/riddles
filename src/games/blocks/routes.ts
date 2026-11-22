import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/blocks',
    name: 'blocks',
    component: () => import('./BlocksLobby.vue'),
  },
  {
    // `?new=1` starts a new game; without it the saved game is resumed.
    path: '/blocks/play',
    name: 'blocks-play',
    component: () => import('./BlocksPlay.vue'),
  },
]
