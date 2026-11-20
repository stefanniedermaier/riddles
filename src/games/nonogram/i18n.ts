import type { Messages } from '@/i18n/types'

/** English texts of the Nonogram game (namespace `nonogram`). */
export const en = {
  name: 'Nonogram',
  tagline: 'Fill the grid using the number clues.',
}

export const de: Messages<typeof en> = {
  name: 'Nonogram',
  tagline: 'Fülle das Raster anhand der Zahlenhinweise.',
}
