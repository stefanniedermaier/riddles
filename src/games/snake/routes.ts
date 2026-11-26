import type { RouteRecordRaw } from 'vue-router'

import { playProps } from '../routes'

export const routes: RouteRecordRaw[] = [
  {
    path: '/snake',
    name: 'snake',
    component: () => import('./SnakeLobby.vue'),
  },
  {
    // New run: `?new=1`; without query the saved run of the mode is resumed.
    path: '/snake/play/:variant(classic|open|maze)',
    props: playProps,
    name: 'snake-play',
    component: () => import('./SnakePlayRoute.vue'),
  },
]
