import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Spider',
  tagline: 'Zwei Kartenspiele, zehn Spalten: Baue Reihen vom König bis zum Ass.',
  seo: {
    about: 'Spider-Solitär mit zwei Kartenspielen und zehn Spalten: Baue Folgen vom König bis zum Ass mit 1, 2 oder 4 Farben. Mit Rückgängig und Hinweisen.',
  },
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
