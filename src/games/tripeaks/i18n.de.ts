import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'TriPeaks',
  tagline: 'Räume drei Gipfel mit Karten, die eins höher oder niedriger sind.',
  seo: {
    about: 'TriPeaks-Solitär: Räume drei Gipfel mit Karten, die eins höher oder niedriger sind. Serien und Gipfelboni im Punktemodus.',
  },
  variants: {
    easy: 'Leicht · Ass und König passen',
    medium: 'Mittel · ohne K–A',
    hard: 'Schwer · beliebige Spiele',
  },
  rules: {
    goal: 'Räume alle 28 Karten der drei Gipfel ab.',
    play: 'Tippe eine offene Karte an, die eins höher oder niedriger ist als die Karte auf der Ablage – die Farbe ist egal.',
    stock: 'Passt nichts, tippe auf den Stapel für die nächste Karte. Ist der Stapel leer und nichts passt, ist das Spiel verloren.',
    wrap: 'Nur bei Leicht passen Ass und König aufeinander (K–A–2); bei Mittel und Schwer endet die Folge bei Ass und König.',
    points: 'Im Punktemodus bringen Karten in Folge immer mehr Punkte; ein abgeräumter Gipfel gibt einen Bonus.',
  },
  play: {
    streak: 'Serie',
    stock: 'Stapel',
  },
}
