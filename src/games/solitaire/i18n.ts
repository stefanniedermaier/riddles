/** English texts of Solitaire (namespace `solitaire`). */
export const en = {
  name: 'Solitaire',
  tagline: 'The classic patience: sort all cards onto four foundations.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'Klondike solitaire: draw 1 or 3, limited or unlimited passes, time or points – with solvable deals and hints.',
  },
  variants: {
    draw1: 'Draw 1',
    'draw1-1pass': 'Draw 1 · one pass',
    draw3: 'Draw 3',
    'draw3-3pass': 'Draw 3 · three passes',
  },
  rules: {
    goal: 'Move all cards to the four foundations, one per suit, from ace to king.',
    tableau: 'In the columns, build down in alternating colours (red on black). Only a king goes to an empty column.',
    stock: 'Tap the stock to turn up one or three cards; only the top one can be played.',
    passes:
      'With "one pass" or "three passes" the waste can be turned over only that often. Draw 1 with one pass is rarely winnable – those deals are not checked.',
  },
}
