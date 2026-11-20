import type { Messages } from '@/i18n/types'

/** English texts of the Crowns game (namespace `crowns`). */
export const en = {
  name: 'Crowns',
  tagline: 'One crown per row, column and region.',
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'How to play',
    goal: 'Place one crown in every row, every column and every coloured region.',
    touch: 'Crowns must not touch each other – not even diagonally.',
    controls:
      'Tap a cell once to mark it with ✕, twice for a crown and a third time to clear it. Drag across cells to mark several at once.',
  },
  lobby: {
    newGame: 'New game',
    confirmNewTitle: 'Start a new game?',
    confirmNew: 'Your current game will be lost.',
    start: 'Start',
  },
  play: {
    clear: 'Clear',
    clearConfirm: 'Remove all crowns and marks?',
    rules: 'Rules',
    crownsPlaced: '{placed} / {total} crowns',
    solvedText: 'Every crown is in place.',
  },
  settings: {
    autoMark: 'Show blocked cells',
    autoMarkDesc: 'A dot marks cells that cannot hold a crown because of crowns you placed.',
    showConflicts: 'Show conflicts',
    showConflictsDesc: 'Crowns that break a rule turn red.',
  },
  unit: {
    row: 'row {n}',
    col: 'column {n}',
    region: 'the highlighted region',
    rows: 'rows {list}',
    cols: 'columns {list}',
    and: 'and',
  },
  technique: {
    lastCell: 'Last free cell',
    confinement: 'Confinement',
    forced: 'Blocking',
    groupConfinement: 'Group confinement',
    mistake: 'Mistake',
  },
  hint: {
    title: 'Hint',
    wrongCrown: 'This crown is not part of the solution.',
    wrongMark: 'This cell is marked, but it needs a crown.',
    fix: 'Remove it',
    lastCell: 'Only one free cell is left in {unit} – it must hold the crown.',
    confinementRegion:
      'All free cells of the highlighted region lie in {line}. Its crown goes there, so the other cells of {line} can be marked.',
    confinementLine:
      'All free cells of {line} lie in the highlighted region. So that region’s crown is in {line} – its other cells can be marked.',
    forced:
      'A crown on the highlighted cell would block every free cell of {unit}. So this cell can be marked.',
    groupRegions:
      'The {count} highlighted regions only have free cells in {lines}. Their crowns fill these lines, so all other cells there can be marked.',
    groupLines:
      '{lines} only have free cells in the {count} highlighted regions. Those regions get their crowns from there, so their other cells can be marked.',
    solved: 'The puzzle is already solved.',
    stuck: 'No hint available right now.',
  },
}

export const de: Messages<typeof en> = {
  name: 'Crowns',
  tagline: 'Eine Krone pro Zeile, Spalte und Region.',
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'So wird gespielt',
    goal: 'Setze in jede Zeile, jede Spalte und jede farbige Region genau eine Krone.',
    touch: 'Kronen dürfen sich nicht berühren – auch nicht diagonal.',
    controls:
      'Tippe einmal auf ein Feld, um es mit ✕ zu markieren, zweimal für eine Krone und ein drittes Mal zum Leeren. Ziehe über mehrere Felder, um sie gemeinsam zu markieren.',
  },
  lobby: {
    newGame: 'Neues Spiel',
    confirmNewTitle: 'Neues Spiel starten?',
    confirmNew: 'Dein aktuelles Spiel geht dabei verloren.',
    start: 'Starten',
  },
  play: {
    clear: 'Leeren',
    clearConfirm: 'Alle Kronen und Markierungen entfernen?',
    rules: 'Regeln',
    crownsPlaced: '{placed} / {total} Kronen',
    solvedText: 'Alle Kronen sind gesetzt.',
  },
  settings: {
    autoMark: 'Blockierte Felder zeigen',
    autoMarkDesc:
      'Ein Punkt kennzeichnet Felder, auf die wegen deiner gesetzten Kronen keine Krone mehr passt.',
    showConflicts: 'Konflikte zeigen',
    showConflictsDesc: 'Kronen, die gegen eine Regel verstoßen, werden rot.',
  },
  unit: {
    row: 'Zeile {n}',
    col: 'Spalte {n}',
    region: 'der markierten Region',
    rows: 'den Zeilen {list}',
    cols: 'den Spalten {list}',
    and: 'und',
  },
  technique: {
    lastCell: 'Letztes freies Feld',
    confinement: 'Eingrenzung',
    forced: 'Blockade',
    groupConfinement: 'Gruppen-Eingrenzung',
    mistake: 'Fehler',
  },
  hint: {
    title: 'Hinweis',
    wrongCrown: 'Diese Krone gehört nicht zur Lösung.',
    wrongMark: 'Dieses Feld ist markiert, braucht aber eine Krone.',
    fix: 'Entfernen',
    lastCell: 'In {unit} ist nur noch ein Feld frei – dort muss die Krone hin.',
    confinementRegion:
      'Alle freien Felder der markierten Region liegen in {line}. Ihre Krone steht also dort, die übrigen Felder in {line} können markiert werden.',
    confinementLine:
      'Alle freien Felder in {line} gehören zur markierten Region. Deren Krone steht also in {line} – ihre übrigen Felder können markiert werden.',
    forced:
      'Eine Krone auf dem markierten Feld würde alle freien Felder in {unit} blockieren. Dieses Feld kann also markiert werden.',
    groupRegions:
      'Die {count} markierten Regionen haben nur in {lines} freie Felder. Ihre Kronen füllen diese Linien, alle anderen Felder dort können markiert werden.',
    groupLines:
      'In {lines} gibt es nur freie Felder in den {count} markierten Regionen. Diese Regionen bekommen ihre Kronen von dort, ihre übrigen Felder können markiert werden.',
    solved: 'Das Rätsel ist bereits gelöst.',
    stuck: 'Gerade ist kein Hinweis verfügbar.',
  },
}
