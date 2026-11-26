/** English texts of the Sudoku game (namespace `sudoku`). */
export const en = {
  name: 'Sudoku',
  tagline: 'Classic number puzzle with notes and hints.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'Sudoku in four difficulties plus Mini 6×6 – every puzzle has a unique solution, and hints explain the next logical step.',
  },
  modes: {
    label: 'Grid',
    classic: 'Classic 9×9',
    mini: 'Mini 6×6',
    miniShort: 'Mini',
  },
  rules: {
    title: 'How to play',
    goalClassic: 'Fill the 9×9 grid so that every row, every column and every 3×3 box contains each digit from 1 to 9 exactly once.',
    goalMini: 'Fill the 6×6 grid so that every row, every column and every 2×3 box contains each digit from 1 to 6 exactly once.',
    input: 'Tap a cell, then a number. Erase removes your entry; undo takes back the last step.',
    notes: 'Notes mode lets you jot down candidates. A hint explains the next logical step.',
  },
  lobby: {
    continueDetail: '{difficulty} · {time}',
    best: 'Best {time}',
    noBest: 'Not solved yet',
  },
  play: {
    notes: 'Notes',
    erase: 'Erase',
    hint: 'Hint',
    undo: 'Undo',
    restart: 'Clear entries',
    restartConfirm: 'Remove all your entries and notes? The timer keeps running (can be undone).',
    newGameConfirm: 'Start a new {difficulty} puzzle? The current one will be lost.',
    remaining: '{count} left',
    cellLabel: 'Row {row}, column {col}',
    cellGiven: 'given {digit}',
    cellValue: '{digit}',
    cellEmpty: 'empty',
    cellNotes: 'notes {digits}',
    solvedSubtitle: '{difficulty} solved',
    backToLobby: 'Choose difficulty',
  },
  settings: {
    highlightPeers: 'Highlight row, column and box',
    highlightSameDigits: 'Highlight same digits',
    autoCleanNotes: 'Remove notes automatically',
    autoCleanNotesDetail: 'Placing a digit removes it from the notes in its row, column and box.',
  },
  techniques: {
    nakedSingle: 'Naked single',
    hiddenSingle: 'Hidden single',
    pointing: 'Pointing',
    claiming: 'Box/line reduction',
    nakedPair: 'Naked pair',
    hiddenPair: 'Hidden pair',
    nakedTriple: 'Naked triple',
    hiddenTriple: 'Hidden triple',
    xWing: 'X-Wing',
    xyWing: 'XY-Wing',
    swordfish: 'Swordfish',
  },
  units: {
    row: 'row {n}',
    col: 'column {n}',
    box: 'box {n}',
    cell: 'R{row}C{col}',
    and: ' and ',
  },
  hint: {
    title: 'Hint',
    mistakeTitle: 'Check your entries',
    mistakeOne: 'The highlighted entry is wrong.',
    mistakeMany: 'The {count} highlighted entries are wrong.',
    eraseMistakes: 'Erase wrong entries',
    revealTitle: 'Try this cell',
    reveal: '{cell} must be {digit}.',
    fillIn: 'Fill in',
    first: 'First:',
    then: 'Then:',
    moreSteps: '(plus {count} more preparation {count|step|steps})',
    explain: {
      nakedSingle: '{cell} has only one possible digit left: {digit}.',
      hiddenSingle: 'In {unit}, the {digit} fits only in {cell}.',
      pointing:
        'In {box}, the {digit} can only go in {line}. So it can be removed from the rest of {line}.',
      claiming:
        'In {line}, the {digit} can only go in {box}. So it can be removed from the rest of {box}.',
      nakedSubset:
        '{cells} in {unit} can only hold {digits}. These digits can be removed from the other cells of {unit}.',
      hiddenSubset:
        'In {unit}, {digits} only fit in {cells}. All other digits can be removed from these cells.',
      fish: 'In {base}, the {digit} only fits in {cover}. So it can be removed from the rest of {cover}.',
      xyWing:
        '{pivot} is {a} or {b}. Either way, a {c} ends up in {pincer1} or {pincer2} – so {c} can be removed from every cell that sees both.',
    },
  },
}
