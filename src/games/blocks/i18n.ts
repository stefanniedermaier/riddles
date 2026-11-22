import type { Messages } from '@/i18n/types'

/** English texts of the Blocks game (namespace `blocks`). */
export const en = {
  name: 'Blocks',
  tagline: 'Place blocks and clear full rows and columns.',
  variants: {
    classic: 'Classic',
  },
  lobby: {
    howToTitle: 'How to play',
    howTo:
      'Drag one of the three pieces onto the board – or tap a piece and then a cell. Every full row and column disappears. Pieces cannot be rotated.',
    howToScore:
      'Clearing several lines at once and clearing with several pieces in a row (combo) gives bonus points. The game ends when no piece fits any more.',
    newGame: 'New game',
    newGameDetail: '8×8 board, three pieces at a time',
    continue: 'Continue',
    continueDetail: '{score} points',
    best: 'Best: {score}',
    confirmNewTitle: 'Start a new game?',
    confirmNew: 'Your current game will be lost.',
    start: 'Start',
  },
  play: {
    best: 'Best',
    tray: 'Pieces',
    piece: 'Piece {n}, {cells} blocks',
    piecePlaced: 'Piece {n}, already placed',
    board: 'Blocks board, 8 by 8. Arrow keys move, Enter places the selected piece.',
    combo: 'Combo ×{n}',
    lines: '{n} lines!',
    boardCleared: 'Board cleared! +{bonus}',
    noSpace: 'No piece fits – game over.',
    keyboardHint: 'Keys: 1–3 choose a piece, arrows move, Enter places.',
  },
  pause: {
    title: 'Paused',
    newGame: 'New game',
    confirmNew: 'End this game and start a new one?',
    quit: 'Back to menu',
  },
  result: {
    gameOver: 'No more space',
    lines: 'Lines cleared',
    moves: 'Pieces placed',
    playAgain: 'Play again',
    menu: 'Menu',
  },
}

export const de: Messages<typeof en> = {
  name: 'Blocks',
  tagline: 'Lege Blöcke und räume volle Reihen und Spalten ab.',
  variants: {
    classic: 'Klassisch',
  },
  lobby: {
    howToTitle: 'So geht’s',
    howTo:
      'Ziehe eines der drei Teile aufs Feld – oder tippe ein Teil und dann ein Feld an. Jede volle Reihe und Spalte verschwindet. Teile lassen sich nicht drehen.',
    howToScore:
      'Mehrere Linien auf einmal und Abräumen mit mehreren Teilen hintereinander (Combo) bringen Bonuspunkte. Das Spiel endet, wenn kein Teil mehr passt.',
    newGame: 'Neues Spiel',
    newGameDetail: '8×8-Feld, jeweils drei Teile',
    continue: 'Fortsetzen',
    continueDetail: '{score} Punkte',
    best: 'Rekord: {score}',
    confirmNewTitle: 'Neues Spiel starten?',
    confirmNew: 'Dein aktuelles Spiel geht verloren.',
    start: 'Starten',
  },
  play: {
    best: 'Rekord',
    tray: 'Teile',
    piece: 'Teil {n}, {cells} Blöcke',
    piecePlaced: 'Teil {n}, bereits gelegt',
    board: 'Blocks-Spielfeld, 8 mal 8. Pfeiltasten bewegen, Enter legt das gewählte Teil.',
    combo: 'Combo ×{n}',
    lines: '{n} Linien!',
    boardCleared: 'Feld leer geräumt! +{bonus}',
    noSpace: 'Kein Teil passt mehr – Spielende.',
    keyboardHint: 'Tasten: 1–3 wählen ein Teil, Pfeile bewegen, Enter legt.',
  },
  pause: {
    title: 'Pause',
    newGame: 'Neues Spiel',
    confirmNew: 'Dieses Spiel beenden und ein neues starten?',
    quit: 'Zurück zum Menü',
  },
  result: {
    gameOver: 'Kein Platz mehr',
    lines: 'Linien abgeräumt',
    moves: 'Teile gelegt',
    playAgain: 'Nochmal spielen',
    menu: 'Menü',
  },
}
