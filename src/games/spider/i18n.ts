import type { Messages } from '@/i18n/types'

/** English texts of Spider (namespace `spider`). */
export const en = {
  name: 'Spider',
  tagline: 'Two decks, ten columns: build runs from king to ace.',
  variants: {
    suits1: '1 suit',
    suits2: '2 suits',
    suits4: '4 suits',
  },
  rules: {
    goal: 'Build eight runs from king down to ace in one suit – a complete run leaves the table.',
    build: 'Any card goes on a card one rank higher, but only runs of one suit move together. Any card or run may go to an empty column.',
    runs: 'A face-down card turns up when it is uncovered.',
    deal: 'Tap the stock to deal one card onto every column – only when no column is empty.',
    fourSuits: 'With 4 suits not every deal can be solved.',
  },
  play: {
    runs: 'Runs',
    deals: 'Deals',
    runsLabel: 'Completed runs: {n}',
    stockLabel: 'Stock: {n} {n|deal|deals} left',
  },
}

export const de: Messages<typeof en> = {
  name: 'Spider',
  tagline: 'Zwei Kartenspiele, zehn Spalten: Baue Reihen vom König bis zum Ass.',
  variants: {
    suits1: '1 Farbe',
    suits2: '2 Farben',
    suits4: '4 Farben',
  },
  rules: {
    goal: 'Baue acht Reihen vom König bis zum Ass in einer Farbe – eine fertige Reihe verlässt den Tisch.',
    build: 'Jede Karte passt auf eine um eins höhere, aber nur Reihen einer Farbe ziehen gemeinsam. Auf ein leeres Feld darf jede Karte oder Reihe.',
    runs: 'Eine verdeckte Karte wird aufgedeckt, sobald sie frei liegt.',
    deal: 'Tippe auf den Stapel, um auf jede Spalte eine Karte zu legen – nur wenn keine Spalte leer ist.',
    fourSuits: 'Bei 4 Farben ist nicht jedes Spiel lösbar.',
  },
  play: {
    runs: 'Reihen',
    deals: 'Austeilen',
    runsLabel: 'Fertige Reihen: {n}',
    stockLabel: 'Stapel: noch {n}-mal austeilen',
  },
}
