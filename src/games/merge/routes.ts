import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/merge',
    name: 'merge',
    component: () => import('./MergeLobby.vue'),
  },
  {
    // New run: `?new=1`; without query the saved run of the variant is resumed.
    path: '/merge/play/:variant(small|classic|large)',
    name: 'merge-play',
    component: () => import('./MergePlayRoute.vue'),
  },
]
