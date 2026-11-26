/** English texts of FreeCell (namespace `freecell`). */
export const en = {
  name: 'FreeCell',
  tagline: 'All cards open, four free cells – patience by pure logic.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'FreeCell solitaire: all cards open, 4, 3 or 2 free cells – patience by pure logic, and every deal is solvable.',
  },
  variants: {
    cells4: '4 free cells',
    cells3: '3 free cells',
    cells2: '2 free cells',
  },
  rules: {
    goal: 'Move all cards to the four foundations, one per suit, from ace to king.',
    tableau: 'In the columns, build down in alternating colours. Any card may go to an empty column.',
    cells: 'Each free cell holds one card for a while.',
    groups: 'A group of cards moves at once when there are enough free cells and empty columns for it.',
  },
  play: {
    cells: 'Free cells',
  },
}
