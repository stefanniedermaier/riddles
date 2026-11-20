# Plan 07 – Nonogram

Fill cells of a grid so that every row and column matches its clues: each clue lists the
lengths of the consecutive filled runs in that line, in order, separated by at least one
empty cell. Genre name *Nonogram*; artwork and puzzles are original and generated.

## 1. Difficulty → size

| Difficulty | Size (cols × rows) | Fill density (approx.) | Logic required            |
| ---------- | ------------------ | ---------------------- | ------------------------- |
| Easy       | 5×5                | 55–65 %                | simple line overlaps       |
| Medium     | 10×10              | 50–60 %                | full single-line solving   |
| Hard       | 15×15              | 45–55 %                | line solving, more passes  |
| Expert     | 20×15 (landscape-fitting: 15 cols × 20 rows on phones if needed) | 45–55 % | line solving, many passes |

Every puzzle has exactly one solution and is solvable by **line logic alone** (repeatedly
deducing cells that are fixed in every arrangement of a single row/column) – no guessing.

## 2. Data model

```ts
interface NonogramPuzzle {
  seed: number
  difficulty: Difficulty
  width: number
  height: number
  solution: (0 | 1)[]          // row-major
  rowClues: number[][]
  colClues: number[][]
}
type CellMark = 0 | 1 | 2       // unknown | filled | crossed (marked empty)
interface NonogramSave {        // nonogram:current:v1
  puzzle: NonogramPuzzle
  cells: CellMark[]
  elapsedMs: number
  hintsUsed: number
  mistakes: number              // counted while mistake checking is on
  undo: …                       // compact steps (changed cells + previous marks)
}
```

## 3. Algorithms

- **Generator:** random patterns with structure (seeded noise + smoothing / random blobs,
  optional mirror symmetry), density per difficulty; reject trivial (empty lines everywhere)
  or degenerate ones. Derive clues, run the line solver; accept if it solves the grid
  completely (⇒ unique and logic-solvable). Otherwise tweak cells in unsolved areas and
  retry; attempt budget with deterministic results per seed. Runs in a worker with a
  prefetch pool.
- **Line solver:** for one line + clue, compute the cells that are filled/empty in all
  valid placements (left-most/right-most overlap + DP over placements, O(n·k)). Propagate
  over rows/columns until fixpoint.
- **Grading:** number of propagation passes / cells deduced by advanced overlaps, used to
  keep difficulties consistent within a size.

## 4. UI

- Lobby (`#/nonogram`) with continue, difficulty list (size, best time), rules for
  first-time players at the top, afterwards below.
- Board: clue column on the left, clue row on top (vertical numbers), thicker guide lines
  every 5 cells, satisfied clues greyed out, current row/column highlight.
- Input: tool toggle *Fill* / *Cross*; tap cycles according to the tool; **drag paints a
  straight line** (row or column) with the start cell's resulting value; pointer capture +
  hit testing like Crowns/Links. Optional long-press = cross.
- Mistake checking (setting, default on): a wrong fill is shown in the error colour and
  counted; off → errors only revealed by hints.
- Hint: next logical line step (highlight the line, explain e.g. "Row 4: the 6 must cover
  cells 3–5"), *Apply*; if there is a wrong mark, the hint points it out first.
- Undo (button + Ctrl/Cmd+Z, persisted), Restart (confirm).
- Win → result dialog (time, mistakes, hints, new best) with New game · Nonogram menu · Home;
  the finished pattern is shown briefly.
- Must fit 360×640: 15×15 ≈ 18 px cells plus clues; for Expert allow pinch-free horizontal
  fit by using compact clue fonts (and rotate to 15×20 portrait if 20 columns do not fit).

## 5. Statistics & storage

Per difficulty `recordStart` / `recordFinish({ timeMs })`. Keys `nonogram:current:v1`,
`nonogram:pool:v1`, `nonogram:settings`.

## 6. Tests

Line solver against brute force on random short lines; generator per difficulty and seeds:
clues match solution, fully line-solvable, unique, deterministic; rules (painting, crossing,
completion, mistakes); undo; hints; a component test that solves a game via hints.
