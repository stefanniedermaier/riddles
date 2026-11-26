import { playProps, queryString, standardRoutes } from '../routes'

export const routes = standardRoutes(
  'sudoku',
  () => import('./SudokuLobby.vue'),
  () => import('./SudokuPlay.vue'),
  // `?mode=mini` picks the mini Sudoku.
  (route) => ({ ...playProps(route), requestedMode: queryString(route.query.mode) }),
)
