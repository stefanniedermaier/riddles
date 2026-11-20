import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/sudoku',
    name: 'sudoku',
    component: () => import('@/views/ComingSoon.vue'),
    props: { title: 'Sudoku' },
  },
]
