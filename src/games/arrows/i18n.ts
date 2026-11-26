/** English texts of the Arrows game (namespace `arrows`). */
export const en = {
  name: 'Arrows',
  tagline: 'Tap the arrows in the right order to clear the board.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'Arrow puzzle: tap the arrows in the right order – each one slides out only if its way is free. 6×6 to 12×12, always solvable, with hints.',
  },
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
