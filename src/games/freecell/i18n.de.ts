import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'FreeCell',
  tagline: 'Alle Karten offen, vier freie Zellen – Patience mit reiner Logik.',
  seo: {
    about: 'FreeCell-Patience: Alle Karten offen, 4, 3 oder 2 freie Zellen – reine Logik, und jedes Spiel ist lösbar.',
  },
  variants: {
    cells4: '4 freie Zellen',
    cells3: '3 freie Zellen',
    cells2: '2 freie Zellen',
  },
  rules: {
    goal: 'Lege alle Karten auf die vier Zielstapel, je Farbe vom Ass bis zum König.',
    tableau: 'In den Spalten wird abwärts mit wechselnden Farben gelegt. Auf ein leeres Feld darf jede Karte.',
    cells: 'Jede freie Zelle hält eine Karte zwischendurch fest.',
    groups: 'Eine Kartenfolge zieht als Ganzes, wenn genug freie Zellen und leere Spalten dafür da sind.',
  },
  play: {
    cells: 'Freie Zellen',
  },
}
