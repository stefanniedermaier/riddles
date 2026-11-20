import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/merge',
    name: 'merge',
    component: () => import('@/views/ComingSoon.vue'),
    props: { title: 'Merge' },
  },
]
