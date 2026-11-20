import type { Messages } from '@/i18n/types'

/** English texts of the Links game (namespace `links`). */
export const en = {
  name: 'Links',
  tagline: 'Connect matching dots and fill every cell.',
}

export const de: Messages<typeof en> = {
  name: 'Links',
  tagline: 'Verbinde gleiche Punkte und fülle jedes Feld.',
}
