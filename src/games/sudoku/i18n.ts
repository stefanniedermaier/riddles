import type { Messages } from '@/i18n/types'

/** English texts of the Sudoku game (namespace `sudoku`). */
export const en = {
  name: 'Sudoku',
  tagline: 'Classic number puzzle with notes and hints.',
}

export const de: Messages<typeof en> = {
  name: 'Sudoku',
  tagline: 'Klassisches Zahlenrätsel mit Notizen und Hinweisen.',
}
