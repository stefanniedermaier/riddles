import type { Messages } from '@/i18n/types'

/** English texts of the Arrows game (namespace `arrows`). */
export const en = {
  name: 'Arrows',
  tagline: 'Tap the arrows in the right order to clear the board.',
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'How to play',
    goal: 'Clear the board: tap an arrow and it slides out in the direction it points.',
    blocked: 'An arrow only leaves if nothing is in its way up to the edge of the board.',
    lives:
      'Tapping a blocked arrow costs one of your three hearts. Find the right order – there always is one.',
  },
  lobby: {
    newGame: 'New game',
    confirmNewTitle: 'Start a new puzzle?',
    confirmNew: 'Your current puzzle will be lost.',
    start: 'Start',
    savedInfo: '{difficulty} · {size} · {left} arrows left · {time}',
  },
  play: {
    lives: 'Hearts',
    livesValue: '{lives} of {max} hearts left',
    left: 'Arrows left',
    restart: 'Restart',
    restartConfirm: 'Start this puzzle again from the beginning?',
    toMenu: 'Arrows menu',
    rules: 'Rules',
    board: 'Arrows board, {size} by {size}',
    cell: 'row {row}, column {col}',
    arrowLabel: 'arrow pointing {direction}',
    hintShown: 'This arrow can leave now.',
    blocked: 'Blocked! One heart lost.',
  },
  directions: {
    up: 'up',
    right: 'right',
    down: 'down',
    left: 'left',
  },
  result: {
    solvedText: 'Every arrow found its way out.',
    failedTitle: 'Out of hearts',
    failedText: 'The arrows got stuck. Try again – there always is a way.',
    livesLeft: 'Hearts left',
    arrowsLeft: 'Arrows left',
    tryAgain: 'Try again',
    newPuzzle: 'New puzzle',
  },
  settings: {
    showBlockedPath: 'Show what blocks an arrow',
    showBlockedPathDesc: 'After a bump, the way up to the blocking arrow lights up briefly.',
    colorByDirection: 'Colour by direction',
    colorByDirectionDesc: 'Every direction gets its own colour. Makes the puzzle easier.',
  },
}

export const de: Messages<typeof en> = {
  name: 'Arrows',
  tagline: 'Tippe die Pfeile in der richtigen Reihenfolge an und räume das Feld.',
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'So wird gespielt',
    goal: 'Räume das Feld: Tippe einen Pfeil an, und er gleitet in seine Richtung hinaus.',
    blocked: 'Ein Pfeil kommt nur hinaus, wenn bis zum Rand nichts im Weg ist.',
    lives:
      'Ein blockierter Pfeil kostet eines deiner drei Herzen. Finde die richtige Reihenfolge – es gibt immer eine.',
  },
  lobby: {
    newGame: 'Neues Spiel',
    confirmNewTitle: 'Neues Rätsel starten?',
    confirmNew: 'Dein aktuelles Rätsel geht verloren.',
    start: 'Starten',
    savedInfo: '{difficulty} · {size} · noch {left} Pfeile · {time}',
  },
  play: {
    lives: 'Herzen',
    livesValue: 'Noch {lives} von {max} Herzen',
    left: 'Pfeile übrig',
    restart: 'Neu starten',
    restartConfirm: 'Dieses Rätsel noch einmal von vorn beginnen?',
    toMenu: 'Arrows-Menü',
    rules: 'Regeln',
    board: 'Arrows-Feld, {size} mal {size}',
    cell: 'Zeile {row}, Spalte {col}',
    arrowLabel: 'Pfeil nach {direction}',
    hintShown: 'Dieser Pfeil kann jetzt hinaus.',
    blocked: 'Blockiert! Ein Herz verloren.',
  },
  directions: {
    up: 'oben',
    right: 'rechts',
    down: 'unten',
    left: 'links',
  },
  result: {
    solvedText: 'Alle Pfeile haben den Weg hinaus gefunden.',
    failedTitle: 'Keine Herzen mehr',
    failedText: 'Die Pfeile stecken fest. Versuch es noch einmal – es gibt immer einen Weg.',
    livesLeft: 'Herzen übrig',
    arrowsLeft: 'Pfeile übrig',
    tryAgain: 'Nochmal versuchen',
    newPuzzle: 'Neues Rätsel',
  },
  settings: {
    showBlockedPath: 'Zeigen, was einen Pfeil blockiert',
    showBlockedPathDesc: 'Nach einem Anstoßen leuchtet der Weg bis zum blockierenden Pfeil kurz auf.',
    colorByDirection: 'Farbe je Richtung',
    colorByDirectionDesc: 'Jede Richtung bekommt eine eigene Farbe. Macht das Rätsel leichter.',
  },
}
