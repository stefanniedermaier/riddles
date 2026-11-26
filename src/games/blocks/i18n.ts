/** English texts of the Blocks game (namespace `blocks`). */
export const en = {
  name: 'Blocks',
  tagline: 'Place blocks and clear full rows and columns.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'Block puzzle: place three pieces at a time on an 8×8 board and clear full rows and columns. Combos and a cleared board earn bonus points.',
  },
  variants: {
    classic: 'Classic',
  },
  lobby: {
    howToTitle: 'How to play',
    howTo:
      'Drag one of the three pieces onto the board – or tap a piece and then a cell. Every full row and column disappears. Pieces cannot be rotated.',
    howToScore:
      'Clearing several lines at once and clearing with several pieces in a row (combo) gives bonus points. The game ends when no piece fits any more.',
    newGameDetail: '8×8 board, three pieces at a time',
    continue: 'Continue',
    continueDetail: '{score} points',
    best: 'Best: {score}',
  },
  play: {
    best: 'Best',
    tray: 'Pieces',
    piece: 'Piece {n}, {cells} {cells|block|blocks}',
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
