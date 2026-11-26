import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Solitaire',
  tagline: 'Die klassische Patience: Lege alle Karten auf vier Zielstapel.',
  seo: {
    about: 'Klondike-Solitär (Patience): 1 oder 3 Karten ziehen, begrenzte oder freie Durchgänge, Zeit oder Punkte – mit lösbaren Spielen und Hinweisen.',
  },
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
