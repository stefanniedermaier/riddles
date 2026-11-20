import type { Messages } from '@/i18n/types'

/** English texts of the Arrows game (namespace `arrows`). */
export const en = {
  name: 'Arrows',
  tagline: 'Tap the arrows in the right order to clear the board.',
}

export const de: Messages<typeof en> = {
  name: 'Arrows',
  tagline: 'Tippe die Pfeile in der richtigen Reihenfolge an und räume das Feld.',
}
