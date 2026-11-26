/** English texts of the Nonogram game (namespace `nonogram`). */
export const en = {
  name: 'Nonogram',
  tagline: 'Fill the grid using the number clues.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'Nonograms, also called Hanjie or paint by numbers: fill the grid by the number clues. 5×5 to 15×20, unique and solvable by logic.',
  },
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
