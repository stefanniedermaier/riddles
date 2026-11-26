import type { Messages } from '@/i18n/types'

/** English texts of FreeCell (namespace `freecell`). */
export const en = {
  name: 'FreeCell',
  tagline: 'All cards open, four free cells – patience by pure logic.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'FreeCell solitaire: all cards open, 4, 3 or 2 free cells – patience by pure logic, and every deal is solvable.',
  },
  variants: {
    cells4: '4 free cells',
    cells3: '3 free cells',
    cells2: '2 free cells',
  },
  rules: {
    goal: 'Move all cards to the four foundations, one per suit, from ace to king.',
    tableau: 'In the columns, build down in alternating colours. Any card may go to an empty column.',
    cells: 'Each free cell holds one card for a while.',
    groups: 'A group of cards moves at once when there are enough free cells and empty columns for it.',
  },
  play: {
    cells: 'Free cells',
  },
}

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
