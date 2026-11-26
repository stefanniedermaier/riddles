/** English texts of Spider (namespace `spider`). */
export const en = {
  name: 'Spider',
  tagline: 'Two decks, ten columns: build runs from king to ace.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'Spider solitaire with two decks and ten columns: build runs from king to ace with 1, 2 or 4 suits. With undo and hints.',
  },
  variants: {
    suits1: '1 suit',
    suits2: '2 suits',
    suits4: '4 suits',
  },
  rules: {
    goal: 'Build eight runs from king down to ace in one suit – a complete run leaves the table.',
    build: 'Any card goes on a card one rank higher, but only runs of one suit move together. Any card or run may go to an empty column.',
    runs: 'A face-down card turns up when it is uncovered.',
    deal: 'Tap the stock to deal one card onto every column – only when no column is empty.',
    fourSuits: 'With 4 suits not every deal can be solved.',
  },
  play: {
    runs: 'Runs',
    deals: 'Deals',
    runsLabel: 'Completed runs: {n}',
    stockLabel: 'Stock: {n} {n|deal|deals} left',
  },
}
