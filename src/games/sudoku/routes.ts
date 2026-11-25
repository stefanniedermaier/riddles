import { standardRoutes } from '../routes'

export const routes = standardRoutes(
  'sudoku',
  () => import('./SudokuLobby.vue'),
  () => import('./SudokuPlay.vue'),
)
