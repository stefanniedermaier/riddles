import type { Messages } from '@/i18n/types'

/** English texts of the Links game (namespace `links`). */
export const en = {
  name: 'Links',
  tagline: 'Connect matching dots and fill every cell.',
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'How to play',
    goal: 'Connect every pair of dots of the same colour with a line.',
    fill: 'Lines may not cross or branch – and every cell of the board has to be filled.',
    controls:
      'Drag from a dot to draw. Drag back to shorten a line; drawing through another line cuts it.',
  },
  lobby: {
    newGame: 'New game',
    confirmNewTitle: 'Start a new puzzle?',
    confirmNew: 'Your current puzzle will be lost.',
    start: 'Start',
  },
  play: {
    connected: 'Links',
    filled: 'Filled',
    moves: 'Moves',
    undo: 'Undo',
    restart: 'Restart',
    restartConfirm: 'Remove all lines?',
    toMenu: 'Links menu',
    rules: 'Rules',
    hintShown: 'The {color} line is now drawn.',
    noHint: 'All lines are already correct.',
    board: 'Links board, {size} by {size}',
  },
  result: {
    solvedText: 'Every dot is linked and the board is full.',
    perfectText: 'Perfect – every colour drawn in one move!',
    moves: 'Moves',
    perfect: 'perfect',
  },
  settings: {
    showLabels: 'Letters on dots',
    showLabelsDesc: 'Shows a letter on each dot to tell colours apart without relying on colour.',
  },
}

export const de: Messages<typeof en> = {
  name: 'Links',
  tagline: 'Verbinde gleiche Punkte und fülle jedes Feld.',
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'So wird gespielt',
    goal: 'Verbinde jedes Paar gleichfarbiger Punkte mit einer Linie.',
    fill: 'Linien dürfen sich nicht kreuzen oder verzweigen – und jedes Feld muss gefüllt sein.',
    controls:
      'Ziehe von einem Punkt aus, um zu zeichnen. Zurückziehen kürzt eine Linie; durch eine andere Linie zu zeichnen schneidet sie ab.',
  },
  lobby: {
    newGame: 'Neues Spiel',
    confirmNewTitle: 'Neues Rätsel starten?',
    confirmNew: 'Dein aktuelles Rätsel geht dabei verloren.',
    start: 'Starten',
  },
  play: {
    connected: 'Verbunden',
    filled: 'Gefüllt',
    moves: 'Züge',
    undo: 'Rückgängig',
    restart: 'Neustart',
    restartConfirm: 'Alle Linien entfernen?',
    toMenu: 'Links-Menü',
    rules: 'Regeln',
    hintShown: 'Die Linie {color} ist jetzt eingezeichnet.',
    noHint: 'Alle Linien sind bereits richtig.',
    board: 'Links-Spielfeld, {size} mal {size}',
  },
  result: {
    solvedText: 'Alle Punkte sind verbunden und das Feld ist voll.',
    perfectText: 'Perfekt – jede Farbe in einem Zug gezeichnet!',
    moves: 'Züge',
    perfect: 'perfekt',
  },
  settings: {
    showLabels: 'Buchstaben auf Punkten',
    showLabelsDesc:
      'Zeigt einen Buchstaben auf jedem Punkt, damit sich Farben auch ohne Farbsehen unterscheiden lassen.',
  },
}
