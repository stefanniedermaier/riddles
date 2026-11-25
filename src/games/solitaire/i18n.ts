import type { Messages } from '@/i18n/types'

/** English texts of Solitaire (namespace `solitaire`). */
export const en = {
  name: 'Solitaire',
  tagline: 'The classic patience: sort all cards onto four foundations.',
  variants: {
    draw1: 'Draw 1',
    'draw1-1pass': 'Draw 1 · one pass',
    draw3: 'Draw 3',
    'draw3-3pass': 'Draw 3 · three passes',
  },
  rules: {
    goal: 'Move all cards to the four foundations, one per suit, from ace to king.',
    tableau: 'In the columns, build down in alternating colours (red on black). Only a king goes to an empty column.',
    stock: 'Tap the stock to turn up one or three cards; only the top one can be played.',
    passes:
      'With "one pass" or "three passes" the waste can be turned over only that often. Draw 1 with one pass is rarely winnable – those deals are not checked.',
  },
}

export const de: Messages<typeof en> = {
  name: 'Solitaire',
  tagline: 'Die klassische Patience: Lege alle Karten auf vier Zielstapel.',
  variants: {
    draw1: '1 ziehen',
    'draw1-1pass': '1 ziehen · ein Durchgang',
    draw3: '3 ziehen',
    'draw3-3pass': '3 ziehen · drei Durchgänge',
  },
  rules: {
    goal: 'Lege alle Karten auf die vier Zielstapel, je Farbe vom Ass bis zum König.',
    tableau: 'In den Spalten wird abwärts mit wechselnden Farben gelegt (Rot auf Schwarz). Auf ein leeres Feld darf nur ein König.',
    stock: 'Tippe auf den Stapel, um eine oder drei Karten aufzudecken; nur die oberste ist spielbar.',
    passes:
      'Bei „ein Durchgang“ oder „drei Durchgänge“ darf die Ablage nur so oft umgedreht werden. 1 ziehen mit einem Durchgang ist selten zu gewinnen – diese Spiele werden nicht geprüft.',
  },
}
