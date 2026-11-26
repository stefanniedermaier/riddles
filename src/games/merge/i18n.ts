/** English texts of the Merge game (namespace `merge`). */
export const en = {
  name: 'Merge',
  tagline: 'Slide the tiles and merge equal numbers.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'Sliding number puzzle: merge equal tiles to reach 256, 2048 or 4096 on 3×3, 4×4 or 5×5 boards – then keep going for a high score.',
  },
  variants: {
    small: 'Small · 3×3',
    classic: 'Classic · 4×4',
    large: 'Large · 5×5',
  },
  lobby: {
    howToTitle: 'How to play',
    howTo:
      'Swipe (or use the arrow keys) to slide all tiles. Two equal tiles that meet merge into their sum. After every move a new tile appears. Reach the target tile – and keep going until no move is left.',
    target: 'Reach {target}',
    continue: 'Continue · {score} points',
    best: 'Best {score}',
    highest: 'Top tile {value}',
  },
  play: {
    board: 'Merge board',
    swipeHint: 'Swipe or use the arrow keys',
    tile: '{value}',
    best: 'Best',
    target: 'Target',
  },
  pause: {
    title: 'Paused',
    newGame: 'New game',
    quit: 'Back to menu',
    confirmNew: 'Start a new game? The current score is recorded.',
  },
  target: {
    title: 'You made {target}!',
    text: 'Keep going for a higher score or start over.',
    keepPlaying: 'Keep playing',
    newGame: 'New game',
  },
  result: {
    gameOver: 'No more moves',
    highestTile: 'Top tile',
    moves: 'Moves',
    newRecordTile: 'New top tile!',
    playAgain: 'Play again',
    menu: 'Merge menu',
  },
}
