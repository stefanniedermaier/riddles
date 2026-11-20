import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/shapes',
    name: 'shapes',
    component: () => import('./ShapesLobby.vue'),
  },
  {
    path: '/shapes/levels',
    name: 'shapes-levels',
    component: () => import('./LevelSelect.vue'),
  },
  {
    // New run: `?new=1` (levels: `&level=n`); without query the saved run is resumed.
    path: '/shapes/play/:mode(zen|time|levels)',
    name: 'shapes-play',
    component: () => import('./ShapesPlayRoute.vue'),
  },
]
