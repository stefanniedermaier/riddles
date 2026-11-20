import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/crowns',
    name: 'crowns',
    component: () => import('@/views/ComingSoon.vue'),
    props: { title: 'Crowns' },
  },
]
