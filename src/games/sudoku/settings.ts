import { useGameSettings } from '@/core/settings'

/** Sudoku-specific settings, persisted under `riddles:sudoku:settings`. */
export const sudokuSettings = useGameSettings('sudoku', {
  highlightPeers: true,
  highlightSameDigits: true,
  autoCleanNotes: true,
  /** Last mode chosen in the lobby (`classic` or `mini`); not shown in the settings view. */
  lastMode: 'classic',
})
