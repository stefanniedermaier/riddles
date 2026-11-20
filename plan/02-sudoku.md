# Plan 02 – Sudoku

Classic 9×9 Sudoku with four difficulty levels, a guaranteed unique solution, notes
(candidates) and hints that explain the next logical step.

## 1. Rules

Fill the grid so that every row, column and 3×3 box contains each digit 1–9 exactly once.

## 2. Data model (`logic/types.ts`)

```ts
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type Grid = number[]                 // length 81, 0 = empty, index = row * 9 + col

interface SudokuPuzzle {
  seed: number
  difficulty: Difficulty
  givens: Grid                       // clues
  solution: Grid
  score: number                      // grader score (for statistics / debugging)
  hardestTechnique: TechniqueId
}

interface SudokuSave {               // storage key: sudoku:current:v1
  puzzle: SudokuPuzzle
  values: Grid                       // player entries (givens included)
  notes: number[]                    // length 81, bitmask (bit d = candidate d)
  elapsedMs: number
  hintsUsed: number
  selected: number | null
}
```

## 3. Algorithms

### 3.1 Fast exact solver (`logic/solver.ts`)

Bitmask backtracking (rows/cols/boxes as 9-bit masks) with "most constrained cell first".
`countSolutions(grid, limit = 2)` stops after `limit` solutions; used for uniqueness checks.
Also `solve(grid)` for filling a random complete grid (digit order randomised by RNG).

### 3.2 Human-style logical solver (`logic/techniques.ts`)

Works on a candidate grid (`Uint16Array(81)` bitmasks). Each technique is a function that
finds **one** step:

```ts
interface Step {
  technique: TechniqueId
  placements: { cell: number; digit: number }[]
  eliminations: { cell: number; digit: number }[]
  focusCells: number[]            // cells that justify the step (for highlighting)
  unit?: { kind: 'row' | 'col' | 'box'; index: number }
}
```

| Level | Technique            | Weight | Description                                         |
| ----- | -------------------- | ------ | --------------------------------------------------- |
| 1     | Naked single         | 1      | cell has one candidate                              |
| 1     | Hidden single        | 1      | digit has one place in a unit                       |
| 2     | Pointing             | 3      | box candidates on one line → eliminate on the line  |
| 2     | Claiming (box/line)  | 3      | line candidates in one box → eliminate in the box   |
| 3     | Naked pair / triple  | 5 / 7  | n cells with n candidates in a unit                 |
| 3     | Hidden pair / triple | 6 / 8  | n digits restricted to n cells in a unit            |
| 4     | X-Wing               | 10     | fish of size 2                                      |
| 4     | XY-Wing              | 12     | pivot + two pincers                                 |
| 4     | Swordfish            | 14     | fish of size 3                                      |

`gradePuzzle(givens)` repeatedly applies the simplest available step until solved or stuck
and returns `{ solved, hardestLevel, hardestTechnique, score, steps }`.

### 3.3 Generator (`logic/generator.ts`)

1. Fill a complete random grid (exact solver with randomised digit order).
2. Dig holes in random order using 180° rotational symmetry (pairs of cells). A removal is
   kept only if the puzzle stays **unique** and stays **logically solvable with techniques up
   to the target level**.
3. Stop digging when the givens floor of the difficulty is reached or no further removal is
   possible.
4. Grade the result and accept it if it matches the target:

| Difficulty | Hardest level required | Givens (approx.) | Extra condition         |
| ---------- | ---------------------- | ---------------- | ----------------------- |
| Easy       | 1 (singles)            | 36–42            | –                       |
| Medium     | 2                      | 30–35            | at least one level-2 step |
| Hard       | 3                      | 26–31            | at least one level-3 step |
| Expert     | 4                      | 22–28            | at least one level-4 step |

5. Otherwise retry with a new grid (derived seed). A time budget (~4 s in the worker)
   prevents endless loops; the best candidate found so far (closest to the target) is used
   as a fallback, so the user always gets a puzzle.

Everything is deterministic for a given seed. Generation runs in `generator.worker.ts`; a
prefetch pool keeps one puzzle per difficulty ready.

### 3.4 Hints (`logic/hints.ts`)

`getHint(save)`:

1. If a player entry differs from the solution → hint "This cell is wrong" (highlight the
   cell). Errors are **not** shown automatically – only when a hint is requested.
2. Otherwise build candidates from the current values (ignoring the player's notes) and run
   the logical solver until the first **placement**. The hint reports the placement plus the
   most advanced technique that led to it, e.g.
   *"Pointing in box 4 removes 5 from row 6 → R6C2 can only be 3 (naked single)."*
3. UI: first the explanation with highlighted focus cells; the button "Fill in" applies the
   placement. Every requested hint counts towards `hintsUsed`.

## 4. UI

```
┌───────────────────────────────┐
│ ←  Sudoku · Hard      ⏱ 04:12 │  AppBar (back, difficulty, timer, menu)
├───────────────────────────────┤
│        9×9 board               │  square, max ≈ 520 px
├───────────────────────────────┤
│ [Notes] [Erase] [Hint]         │  tool row (Notes toggles, shows state)
│  1  2  3  4  5  6  7  8  9     │  number pad (remaining count per digit)
└───────────────────────────────┘
```

- **Lobby** (`#/sudoku`): "Continue" (if saved), difficulty list with best time.
- **Board**: thick box borders, givens bold, player digits in accent colour, notes as 3×3
  mini-grid. Highlighting (each a setting): row/col/box of the selected cell, all cells with
  the same digit.
- **Input**: tap cell → tap digit. In notes mode digits toggle candidates. Placing a digit
  removes it from notes of all peers (setting "auto-clean notes", default on). Tapping a
  given selects it (to highlight its digit) but cannot change it.
- **Keyboard** (desktop): 1–9, arrows, Backspace/Delete, `N` toggles notes, `H` hint.
- **Win**: all cells equal the solution → result dialog (time, difficulty, hints, new best?)
  → "New game" / "Home". Stats are recorded; the save is deleted.
- **Menu**: restart (clear entries), new game, settings.
- Timer pauses when the app is hidden or the menu is open.

### Settings (game section)

- Highlight row/column/box (on)
- Highlight same digits (on)
- Auto-clean notes (on)

## 5. Files

```
games/sudoku/
  index.ts  routes.ts  i18n.ts  settings.ts
  SudokuLobby.vue  SudokuPlay.vue  SudokuBoard.vue  SudokuCell.vue  NumberPad.vue
  HintPanel.vue  SudokuSettings.vue
  generator.worker.ts
  logic/ types.ts solver.ts techniques.ts grader.ts generator.ts hints.ts
  logic/__tests__/ solver.test.ts techniques.test.ts generator.test.ts hints.test.ts
```

## 6. Tests

- Exact solver solves known puzzles; `countSolutions` detects multiple solutions.
- Every technique on a hand-crafted position produces the expected step.
- For each difficulty and several seeds: puzzle has a unique solution, is consistent with
  its solution, is logically solvable, and its grade equals the requested difficulty.
- Same seed → identical puzzle.
- Hints: wrong entry is reported; correct state yields a valid placement matching the
  solution.

## 7. Acceptance criteria

- New game starts instantly when a prefetched puzzle exists, otherwise in < 1 s for
  Easy–Hard (worker, spinner shown).
- Every puzzle is solvable by logic alone (no guessing) and has exactly one solution.
- Leaving and reopening the app restores board, notes, timer and selection.
