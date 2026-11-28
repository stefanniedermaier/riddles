import type { RouteRecordRaw } from 'vue-router'

import { playProps } from '../routes'

export const routes: RouteRecordRaw[] = [
  {
    path: '/bubbles',
    name: 'bubbles',
    component: () => import('./BubblesLobby.vue'),
  },
  {
    // New run: `?new=1` (levels: the current level); without query the saved run is resumed.
    path: '/bubbles/play/:variant(endless|levels|time)',
    props: playProps,
    name: 'bubbles-play',
    component: () => import('./BubblesPlayRoute.vue'),
  },
]
