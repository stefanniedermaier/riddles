import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  {
    path: '/sudoku',
    name: 'sudoku',
    component: () => import('./SudokuLobby.vue'),
  },
  {
    // `?new=<difficulty>` starts a new game; without it the saved game is resumed.
    path: '/sudoku/play',
    name: 'sudoku-play',
    component: () => import('./SudokuPlay.vue'),
  },
]
