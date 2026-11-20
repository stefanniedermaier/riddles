import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/arrows',
    name: 'arrows',
    component: () => import('@/views/ComingSoon.vue'),
    props: { title: 'Arrows' },
  },
]
