/** English texts of the Links game (namespace `links`). */
export const en = {
  name: 'Links',
  tagline: 'Connect matching dots and fill every cell.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'Numberlink puzzle: connect each pair of coloured dots – lines never cross and every cell gets filled. 5×5 to 11×11 with hints and undo.',
  },
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'How to play',
    goal: 'Connect every pair of dots of the same colour with a line.',
    fill: 'Lines may not cross or branch – and every cell of the board has to be filled.',
    controls:
      'Drag from a dot to draw. Drag back to shorten a line; drawing through another line cuts it.',
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
    cell: 'Row {row}, column {col}',
    dot: 'dot {color}',
    line: 'line {color}',
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
