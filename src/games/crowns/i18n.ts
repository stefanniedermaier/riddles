import type { Messages } from '@/i18n/types'

/** English texts of the Crowns game (namespace `crowns`). */
export const en = {
  name: 'Crowns',
  tagline: 'One crown per row, column and region.',
}

export const de: Messages<typeof en> = {
  name: 'Crowns',
  tagline: 'Eine Krone pro Zeile, Spalte und Region.',
}
