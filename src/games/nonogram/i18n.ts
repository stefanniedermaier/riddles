import type { Messages } from '@/i18n/types'

/** English texts of the Nonogram game (namespace `nonogram`). */
export const en = {
  name: 'Nonogram',
  tagline: 'Fill the grid using the number clues.',
  sizeLabel: '{width}×{height}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'How to play',
    goal: 'The numbers next to each row and above each column tell you the lengths of the filled blocks in that line, in order.',
    gaps: 'Blocks are separated by at least one empty cell. Every puzzle can be solved by logic alone.',
    controls:
      'Choose Fill or Cross, then tap a cell – or drag along a row or column to mark several. Tapping a marked cell again clears it.',
  },
  play: {
    fill: 'Fill',
    cross: 'Cross',
    tool: 'Tool',
    undo: 'Undo',
    restart: 'Restart',
    restartConfirm: 'Clear all marks?',
    toMenu: 'Nonogram menu',
    rules: 'Rules',
    mistakes: 'Mistakes',
    progress: 'Done',
    board: 'Nonogram board, {width} columns by {height} rows',
    noHint: 'Nothing left to deduce.',
    clueEmpty: 'empty',
  },
  hint: {
    wrongTitle: 'Check your marks',
    wrong: 'The highlighted marks are wrong.',
    fixWrong: 'Remove mistakes',
    stepTitle: '{line}',
    step: 'Clue {clue}: in every way the blocks fit, the highlighted cells are {what}.',
    fills: '{count} filled',
    crosses: '{count} empty',
    and: '{a} and {b}',
  },
  unit: {
    row: 'Row {n}',
    col: 'Column {n}',
  },
  result: {
    solvedText: 'Every clue is satisfied.',
    mistakes: 'Mistakes',
  },
  settings: {
    instantMistakes: 'Show mistakes right away',
    instantMistakesDesc: 'Wrong marks turn red at once and are counted. Otherwise only “Check” reveals them.',
    highlightLines: 'Highlight row and column',
    highlightLinesDesc: 'Tints the row and column of the cell you touch.',
  },
}

export const de: Messages<typeof en> = {
  name: 'Nonogram',
  tagline: 'Fülle das Raster anhand der Zahlenhinweise.',
  sizeLabel: '{width}×{height}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'So wird gespielt',
    goal: 'Die Zahlen neben jeder Zeile und über jeder Spalte geben die Längen der gefüllten Blöcke in dieser Reihe an – in der richtigen Reihenfolge.',
    gaps: 'Zwischen zwei Blöcken liegt mindestens ein leeres Feld. Jedes Rätsel ist rein logisch lösbar.',
    controls:
      'Wähle Füllen oder Kreuz und tippe ein Feld an – oder ziehe entlang einer Zeile oder Spalte, um mehrere zu markieren. Erneutes Antippen löscht die Markierung.',
  },
  play: {
    fill: 'Füllen',
    cross: 'Kreuz',
    tool: 'Werkzeug',
    undo: 'Rückgängig',
    restart: 'Neustart',
    restartConfirm: 'Alle Markierungen löschen?',
    toMenu: 'Nonogram-Menü',
    rules: 'Regeln',
    mistakes: 'Fehler',
    progress: 'Fertig',
    board: 'Nonogram-Spielfeld, {width} Spalten mal {height} Zeilen',
    noHint: 'Hier lässt sich nichts mehr ableiten.',
    clueEmpty: 'leer',
  },
  hint: {
    wrongTitle: 'Prüfe deine Markierungen',
    wrong: 'Die hervorgehobenen Markierungen sind falsch.',
    fixWrong: 'Fehler entfernen',
    stepTitle: '{line}',
    step: 'Hinweis {clue}: Wie auch immer die Blöcke liegen – die hervorgehobenen Felder sind {what}.',
    fills: '{count} gefüllt',
    crosses: '{count} leer',
    and: '{a} und {b}',
  },
  unit: {
    row: 'Zeile {n}',
    col: 'Spalte {n}',
  },
  result: {
    solvedText: 'Alle Hinweise sind erfüllt.',
    mistakes: 'Fehler',
  },
  settings: {
    instantMistakes: 'Fehler sofort anzeigen',
    instantMistakesDesc: 'Falsche Markierungen werden sofort rot und gezählt. Sonst zeigt sie nur „Kontrollieren“.',
    highlightLines: 'Zeile und Spalte hervorheben',
    highlightLinesDesc: 'Tönt Zeile und Spalte des berührten Feldes ein.',
  },
}
