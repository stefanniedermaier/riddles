import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/nonogram',
    name: 'nonogram',
    component: () => import('@/views/ComingSoon.vue'),
    props: { title: 'Nonogram' },
  },
]
