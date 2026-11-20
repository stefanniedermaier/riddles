import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/shapes',
    name: 'shapes',
    component: () => import('@/views/ComingSoon.vue'),
    props: { title: 'Shapes' },
  },
]
