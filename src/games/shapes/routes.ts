import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/shapes',
    name: 'shapes',
    component: () => import('./ShapesLobby.vue'),
  },
  {
    // New run: `?new=1` (levels: the current level); without query the saved run is resumed.
    path: '/shapes/play/:mode(zen|time|levels)',
    name: 'shapes-play',
    component: () => import('./ShapesPlayRoute.vue'),
  },
]
