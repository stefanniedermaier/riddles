/** English texts of the Stars game (namespace `crowns`). */
export const en = {
  name: 'Stars',
  tagline: 'One star per row, column and region.',
  /** Search engines and link previews: what the game is, in one or two sentences. */
  seo: {
    about: 'Star Battle logic puzzle: one star per row, column and region, and stars never touch. 6×6 to 10×10, solvable by logic alone.',
  },
  sizeLabel: '{size}×{size}',
  variantLabel: '{difficulty} · {size}',
  rules: {
    title: 'How to play',
    goal: 'Place one star in every row, every column and every coloured region.',
    touch: 'Stars must not touch each other – not even diagonally.',
    controls:
      'Tap a cell once to mark it with ✕, twice for a star and a third time to clear it. Drag across cells to mark several at once.',
  },
  play: {
    clear: 'Clear',
    clearConfirm: 'Remove all stars and marks?',
    rules: 'Rules',
    crownsPlaced: '{placed} / {total} stars',
    solvedText: 'Every star is in place.',
    undo: 'Undo',
    toMenu: 'Stars menu',
  },
  settings: {
    autoMark: 'Show blocked cells',
    autoMarkDesc: 'A dot marks cells that cannot hold a star because of stars you placed.',
    instantConflicts: 'Show conflicts right away',
    instantConflictsDesc: 'Stars that break a rule turn red at once. Otherwise only “Check” shows mistakes.',
  },
  unit: {
    row: 'row {n}',
    col: 'column {n}',
    region: 'the highlighted region',
    rows: 'rows {list}',
    cols: 'columns {list}',
    and: 'and',
  },
  technique: {
    lastCell: 'Last free cell',
    confinement: 'Confinement',
    forced: 'Blocking',
    groupConfinement: 'Group confinement',
    mistake: 'Mistake',
  },
  hint: {
    title: 'Hint',
    wrongCrown: 'This star is not part of the solution.',
    wrongMark: 'This cell is marked, but it needs a star.',
    fix: 'Remove it',
    lastCell: 'Only one free cell is left in {unit} – it must hold the star.',
    confinementRegion:
      'All free cells of the highlighted region lie in {line}. Its star goes there, so the other cells of {line} can be marked.',
    confinementLine:
      'All free cells of {line} lie in the highlighted region. So that region’s star is in {line} – its other cells can be marked.',
    forced:
      'A star on the highlighted cell would block every free cell of {unit}. So this cell can be marked.',
    groupRegions:
      'The {count} highlighted regions only have free cells in {lines}. Their stars fill these lines, so all other cells there can be marked.',
    groupLines:
      '{lines} only have free cells in the {count} highlighted regions. Those regions get their stars from there, so their other cells can be marked.',
    solved: 'The puzzle is already solved.',
    stuck: 'No hint available right now.',
  },
}
