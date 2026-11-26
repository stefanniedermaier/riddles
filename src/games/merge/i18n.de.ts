import type { Messages } from '@/i18n/types'

import type { en } from './i18n'

export const de: Messages<typeof en> = {
  name: 'Merge',
  tagline: 'Schiebe die Kacheln und verschmelze gleiche Zahlen.',
  seo: {
    about: 'Schiebe-Zahlenrätsel: Verschmelze gleiche Kacheln bis 256, 2048 oder 4096 auf 3×3, 4×4 oder 5×5 – und spiel weiter für den Highscore.',
  },
  variants: {
    small: 'Klein · 3×3',
    classic: 'Klassisch · 4×4',
    large: 'Groß · 5×5',
  },
  lobby: {
    howToTitle: 'So geht’s',
    howTo:
      'Wische (oder nutze die Pfeiltasten), um alle Kacheln zu verschieben. Treffen zwei gleiche Kacheln aufeinander, verschmelzen sie zu ihrer Summe. Nach jedem Zug erscheint eine neue Kachel. Erreiche die Zielkachel – und spiele weiter, bis kein Zug mehr möglich ist.',
    target: 'Ziel: {target}',
    continue: 'Fortsetzen · {score} Punkte',
    best: 'Rekord {score}',
    highest: 'Beste Kachel {value}',
  },
  play: {
    board: 'Merge-Spielfeld',
    swipeHint: 'Wischen oder Pfeiltasten verwenden',
    tile: '{value}',
    best: 'Rekord',
    target: 'Ziel',
  },
  pause: {
    title: 'Pause',
    newGame: 'Neues Spiel',
    quit: 'Zurück zum Menü',
    confirmNew: 'Neues Spiel starten? Die aktuellen Punkte werden gewertet.',
  },
  target: {
    title: '{target} geschafft!',
    text: 'Spiel weiter für mehr Punkte oder beginne neu.',
    keepPlaying: 'Weiterspielen',
    newGame: 'Neues Spiel',
  },
  result: {
    gameOver: 'Keine Züge mehr',
    highestTile: 'Beste Kachel',
    moves: 'Züge',
    newRecordTile: 'Neue beste Kachel!',
    playAgain: 'Nochmal spielen',
    menu: 'Merge-Menü',
  },
}
