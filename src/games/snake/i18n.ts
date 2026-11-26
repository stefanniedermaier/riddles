/** English texts of the Snake game (namespace `snake`). */
export const en = {
  name: 'Snake',
  tagline: 'Steer the snake, eat and grow – without biting yourself.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'The classic Snake game: steer the snake, eat and grow – in three modes and four speeds, including a calm mode that moves step by step.',
  },
  variants: {
    classic: 'Classic',
    open: 'Open',
    maze: 'Maze',
  },
  variantDetails: {
    classic: '15×15 · the walls end the game',
    open: '15×15 · through the wall to the other side',
    maze: '17×17 · walls and stones',
  },
  speeds: {
    slow: 'Slow',
    normal: 'Normal',
    fast: 'Fast',
    calm: 'Calm',
  },
  lobby: {
    howToTitle: 'How to play',
    howTo:
      'Swipe on the board, use the direction buttons or the arrow keys to turn the snake. Every fruit makes it longer. Do not bite yourself – and in Classic and Maze, do not hit the wall.',
    howToCalm:
      'In the calm speed the snake only moves when you give a direction: one step per tap or key, no hurry. Faster speeds give more points per fruit.',
    speed: 'Speed',
    continue: 'Continue · {score} points · {speed}',
    best: 'Best {score} · {speed}',
    bestPlain: 'Best {score}',
  },
  play: {
    board: 'Snake board',
    best: 'Best',
    length: 'Length',
    start: 'Swipe, tap or press an arrow key to start',
    resume: 'Paused – tap to continue',
    hint: 'Swipe, use the buttons or the arrow keys',
    calmHint: 'Every direction moves the snake one step',
    pad: 'Direction',
    up: 'Up',
    down: 'Down',
    left: 'Left',
    right: 'Right',
    summary: 'Length {length}. Fruit: {where}.',
    here: 'eaten',
    noFood: 'none left',
    towards: {
      up: '{n} up',
      down: '{n} down',
      left: '{n} left',
      right: '{n} right',
    },
  },
  pause: {
    title: 'Paused',
    newGame: 'New game',
    quit: 'Back to menu',
    confirmNew: 'End this game and start a new one? The score is recorded.',
  },
  result: {
    gameOver: 'Game over',
    won: 'The board is full!',
    length: 'Length',
    speed: 'Speed',
    playAgain: 'Play again',
    menu: 'Snake menu',
  },
  settings: {
    speed: 'Speed of new games',
    pad: 'Direction buttons',
    padDetail: 'Four buttons below the board, in addition to swiping.',
  },
}
