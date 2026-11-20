import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/links',
    name: 'links',
    component: () => import('@/views/ComingSoon.vue'),
    props: { title: 'Links' },
  },
]
