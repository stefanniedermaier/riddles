import type { Messages } from '@/i18n/types'

/** English texts of the Merge game (namespace `merge`). */
export const en = {
  name: 'Merge',
  tagline: 'Slide the tiles and merge equal numbers.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'Sliding number puzzle: merge equal tiles to reach 256, 2048 or 4096 on 3×3, 4×4 or 5×5 boards – then keep going for a high score.',
  },
  variants: {
    small: 'Small · 3×3',
    classic: 'Classic · 4×4',
    large: 'Large · 5×5',
  },
  lobby: {
    howToTitle: 'How to play',
    howTo:
      'Swipe (or use the arrow keys) to slide all tiles. Two equal tiles that meet merge into their sum. After every move a new tile appears. Reach the target tile – and keep going until no move is left.',
    target: 'Reach {target}',
    continue: 'Continue · {score} points',
    best: 'Best {score}',
    highest: 'Top tile {value}',
  },
  play: {
    board: 'Merge board',
    swipeHint: 'Swipe or use the arrow keys',
    tile: '{value}',
    best: 'Best',
    target: 'Target',
  },
  pause: {
    title: 'Paused',
    newGame: 'New game',
    quit: 'Back to menu',
    confirmNew: 'Start a new game? The current score is recorded.',
  },
  target: {
    title: 'You made {target}!',
    text: 'Keep going for a higher score or start over.',
    keepPlaying: 'Keep playing',
    newGame: 'New game',
  },
  result: {
    gameOver: 'No more moves',
    highestTile: 'Top tile',
    moves: 'Moves',
    newRecordTile: 'New top tile!',
    playAgain: 'Play again',
    menu: 'Merge menu',
  },
}

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
