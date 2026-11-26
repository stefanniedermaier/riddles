/** English texts of TriPeaks (namespace `tripeaks`). */
export const en = {
  name: 'TriPeaks',
  tagline: 'Clear three peaks with cards one higher or one lower.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'TriPeaks solitaire: clear three peaks with cards one higher or one lower. Streaks and peak bonuses in points mode.',
  },
  variants: {
    easy: 'Easy · ace and king connect',
    medium: 'Medium · no K–A',
    hard: 'Hard · any deal',
  },
  rules: {
    goal: 'Clear all 28 cards of the three peaks.',
    play: 'Tap an open card that is one higher or one lower than the card on the waste – the colour does not matter.',
    stock: 'If nothing fits, tap the stock for the next card. With an empty stock and no card that fits the game is lost.',
    wrap: 'Only on Easy do ace and king connect (K–A–2); on Medium and Hard the run ends at ace and king.',
    points: 'In points mode, cards played in a row score more and more; clearing a peak gives a bonus.',
  },
  play: {
    streak: 'Streak',
    stock: 'Stock',
  },
}
