import type { Messages } from '@/i18n/types'

/** English texts of the Merge game (namespace `merge`). */
export const en = {
  name: 'Merge',
  tagline: 'Slide the tiles and merge equal numbers.',
  variants: {
    small: 'Small · 3×3',
    classic: 'Classic · 4×4',
    large: 'Large · 5×5',
  },
}

export const de: Messages<typeof en> = {
  name: 'Merge',
  tagline: 'Schiebe die Kacheln und verschmelze gleiche Zahlen.',
  variants: {
    small: 'Klein · 3×3',
    classic: 'Klassisch · 4×4',
    large: 'Groß · 5×5',
  },
}
