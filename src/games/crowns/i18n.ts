import type { Messages } from '@/i18n/types'

/** English texts of the Stars game (namespace `crowns`). */
export const en = {
  name: 'Stars',
  tagline: 'One star per row, column and region.',
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'How to play',
    goal: 'Place one star in every row, every column and every coloured region.',
    touch: 'Stars must not touch each other – not even diagonally.',
    controls:
      'Tap a cell once to mark it with ✕, twice for a star and a third time to clear it. Drag across cells to mark several at once.',
  },
  play: {
    clear: 'Clear',
    clearConfirm: 'Remove all stars and marks?',
    rules: 'Rules',
    crownsPlaced: '{placed} / {total} stars',
    solvedText: 'Every star is in place.',
    undo: 'Undo',
    toMenu: 'Stars menu',
  },
  settings: {
    autoMark: 'Show blocked cells',
    autoMarkDesc: 'A dot marks cells that cannot hold a star because of stars you placed.',
    instantConflicts: 'Show conflicts right away',
    instantConflictsDesc: 'Stars that break a rule turn red at once. Otherwise only “Check” shows mistakes.',
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
    wrongCrown: 'This star is not part of the solution.',
    wrongMark: 'This cell is marked, but it needs a star.',
    fix: 'Remove it',
    lastCell: 'Only one free cell is left in {unit} – it must hold the star.',
    confinementRegion:
      'All free cells of the highlighted region lie in {line}. Its star goes there, so the other cells of {line} can be marked.',
    confinementLine:
      'All free cells of {line} lie in the highlighted region. So that region’s star is in {line} – its other cells can be marked.',
    forced:
      'A star on the highlighted cell would block every free cell of {unit}. So this cell can be marked.',
    groupRegions:
      'The {count} highlighted regions only have free cells in {lines}. Their stars fill these lines, so all other cells there can be marked.',
    groupLines:
      '{lines} only have free cells in the {count} highlighted regions. Those regions get their stars from there, so their other cells can be marked.',
    solved: 'The puzzle is already solved.',
    stuck: 'No hint available right now.',
  },
}

export const de: Messages<typeof en> = {
  name: 'Stars',
  tagline: 'Ein Stern pro Zeile, Spalte und Region.',
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'So wird gespielt',
    goal: 'Setze in jede Zeile, jede Spalte und jede farbige Region genau einen Stern.',
    touch: 'Sterne dürfen sich nicht berühren – auch nicht diagonal.',
    controls:
      'Tippe einmal auf ein Feld, um es mit ✕ zu markieren, zweimal für einen Stern und ein drittes Mal zum Leeren. Ziehe über mehrere Felder, um sie gemeinsam zu markieren.',
  },
  play: {
    clear: 'Leeren',
    clearConfirm: 'Alle Sterne und Markierungen entfernen?',
    rules: 'Regeln',
    crownsPlaced: '{placed} / {total} Sterne',
    solvedText: 'Alle Sterne sind gesetzt.',
    undo: 'Rückgängig',
    toMenu: 'Stars-Menü',
  },
  settings: {
    autoMark: 'Blockierte Felder zeigen',
    autoMarkDesc:
      'Ein Punkt kennzeichnet Felder, auf die wegen deiner gesetzten Sterne kein Stern mehr passt.',
    instantConflicts: 'Konflikte sofort zeigen',
    instantConflictsDesc: 'Sterne, die gegen eine Regel verstoßen, werden sofort rot. Sonst zeigt nur „Kontrollieren“ Fehler.',
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
    wrongCrown: 'Dieser Stern gehört nicht zur Lösung.',
    wrongMark: 'Dieses Feld ist markiert, braucht aber einen Stern.',
    fix: 'Entfernen',
    lastCell: 'In {unit} ist nur noch ein Feld frei – dort muss der Stern hin.',
    confinementRegion:
      'Alle freien Felder der markierten Region liegen in {line}. Ihr Stern steht also dort, die übrigen Felder in {line} können markiert werden.',
    confinementLine:
      'Alle freien Felder in {line} gehören zur markierten Region. Deren Stern steht also in {line} – ihre übrigen Felder können markiert werden.',
    forced:
      'Ein Stern auf dem markierten Feld würde alle freien Felder in {unit} blockieren. Dieses Feld kann also markiert werden.',
    groupRegions:
      'Die {count} markierten Regionen haben nur in {lines} freie Felder. Ihre Sterne füllen diese Linien, alle anderen Felder dort können markiert werden.',
    groupLines:
      'In {lines} gibt es nur freie Felder in den {count} markierten Regionen. Diese Regionen bekommen ihre Sterne von dort, ihre übrigen Felder können markiert werden.',
    solved: 'Das Rätsel ist bereits gelöst.',
    stuck: 'Gerade ist kein Hinweis verfügbar.',
  },
}
