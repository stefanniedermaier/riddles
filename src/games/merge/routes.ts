import type { RouteRecordRaw } from 'vue-router'

import { playProps } from '../routes'

export const routes: RouteRecordRaw[] = [
  {
    path: '/merge',
    name: 'merge',
    component: () => import('./MergeLobby.vue'),
  },
  {
    // New run: `?new=1`; without query the saved run of the variant is resumed.
    path: '/merge/play/:variant(small|classic|large)',
    props: playProps,
    name: 'merge-play',
    component: () => import('./MergePlayRoute.vue'),
  },
]
