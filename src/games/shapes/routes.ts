import type { RouteRecordRaw } from 'vue-router'

import { playProps } from '../routes'

export const routes: RouteRecordRaw[] = [
  {
    path: '/shapes',
    name: 'shapes',
    component: () => import('./ShapesLobby.vue'),
  },
  {
    // New run: `?new=1` (levels: the current level); without query the saved run is resumed.
    path: '/shapes/play/:mode(zen|time|levels)',
    props: playProps,
    name: 'shapes-play',
    component: () => import('./ShapesPlayRoute.vue'),
  },
]
