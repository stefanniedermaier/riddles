import type { Messages } from '@/i18n/types'

/** English texts of TriPeaks (namespace `tripeaks`). */
export const en = {
  name: 'TriPeaks',
  tagline: 'Clear three peaks with cards one higher or one lower.',
  variants: {
    easy: 'Easy · ace and king connect',
    medium: 'Medium · no K–A',
    hard: 'Hard · any deal',
  },
  rules: {
    goal: 'Clear all 28 cards of the three peaks.',
    play: 'Tap an open card that is one higher or one lower than the card on the waste – the colour does not matter.',
    stock: 'If nothing fits, tap the stock for the next card. With an empty stock and no card that fits the game is lost.',
    wrap: 'Only on Easy do ace and king connect (K–A–2); on Medium and Hard the run ends at ace and king.',
    points: 'In points mode, cards played in a row score more and more; clearing a peak gives a bonus.',
  },
  play: {
    streak: 'Streak',
    stock: 'Stock',
  },
}

export const de: Messages<typeof en> = {
  name: 'TriPeaks',
  tagline: 'Räume drei Gipfel mit Karten, die eins höher oder niedriger sind.',
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
