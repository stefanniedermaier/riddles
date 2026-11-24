# Plan 13 – Mines (Minesweeper)

The classic mine-finding puzzle – reveal every safe cell, numbers tell how many of the eight
neighbours hide a mine – with one twist that fits Riddles: **every board is solvable by logic
alone, no guessing**. Generic mechanic (genre *Minesweeper*); the game is called **Mines**
(German **Minen**), name, artwork and colours are original.

## 1. Rules

- A grid of covered cells hides a known number of mines (shown in the HUD as
  *mines − flags*).
- **Reveal** a cell: a mine ends the round (see *Mine hit*); a safe cell shows the number of
  adjacent mines (8-neighbourhood). A `0` reveals its neighbours automatically (flood fill).
- **Flag** a cell to mark a suspected mine. Flags are notes only: they protect the cell from
  accidental reveals, but the game does not check them while playing.
- **Chord** (setting, default on): tapping a revealed number whose adjacent flag count equals
  the number reveals all its other covered neighbours – if a flag was wrong, this can hit a mine.
- The board is solved when every safe cell is revealed (flags are not required); the
  remaining mines are then flagged automatically.

### Start area

The board starts with a **pre-opened start area** (a `0` cell and its flood fill) instead of
the classic "first click is always safe". Reason: boards are pre-generated in the worker pool
(instant "New game"), and a no-guess board can only be guaranteed for a known start cell.
The start area is at least 9 cells large and lies away from the board edges where possible.

### Mine hit

Revealing a mine shows all mines (wrong flags crossed out) and opens a dialog:

- **Undo move** – back to the state before the fatal tap; counts as a **mistake**.
  The round can still be finished and counts as solved (with mistakes shown in the result).
- **Try again** – same board from the start (elapsed time reset).
- **New game** – the round counts as started, not finished.

This keeps the classic tension (a mine is a real failure) without the frustration of losing
a 10-minute Expert board to one mis-tap on a phone.

## 2. Difficulty → size

Phone first: at most **12 columns** so cells stay ≥ 26 px at 360 px width (similar to
Arrows 12×12). Boards are portrait.

| Difficulty | Board (cols × rows) | Mines | Density | Logic required                         |
| ---------- | ------------------- | ----- | ------- | -------------------------------------- |
| Easy       | 8×10                | 12    | 15 %    | single-cell rules only                 |
| Medium     | 9×13                | 22    | 19 %    | + subset rule (e.g. 1-2 patterns)      |
| Hard       | 10×16               | 35    | 22 %    | subset rule needed repeatedly          |
| Expert     | 12×18               | 50    | 23 %    | + frontier enumeration / mine count    |

Numbers are a starting point; tune density and grading windows with the generator benchmark
(attempts per board, generation time in the worker ≤ ~300 ms on a mid-range phone for Expert).

## 3. Data model

```ts
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

interface MinesPuzzle {
  seed: number
  difficulty: Difficulty
  width: number
  height: number
  mines: number[]        // cell indices (row-major), sorted
  start: number          // the 0 cell of the start area
  grade: number          // hardest technique used + step counts (for tests / tuning)
}

type CellState = 0 | 1 | 2   // covered | revealed | flagged

interface MinesSave {        // mines:current:v1
  puzzle: MinesPuzzle
  cells: CellState[]
  elapsedMs: number
  hintsUsed: number
  mistakes: number           // mine hits undone + wrong flags found by "Check"
  lost: boolean              // true while the mine-hit dialog is open
  before?: CellState[]       // state before the last reveal (for "Undo move" after a hit)
}
```

Neighbour counts are derived from `mines` and not stored. No general undo: reveals are
information, undoing them would make the puzzle trivial. Flag toggles are cheap to redo by hand.

## 4. Algorithms (`logic/`)

### Solver (`solver.ts`)

Works only on what the player can see: revealed numbers, covered cells, total mine count.
Each revealed number gives a constraint *"exactly k mines among these covered cells"*.
Techniques, in order (the order also drives hints and grading):

1. **Single cell** – the number equals its covered neighbours → all are mines; the number
   equals its known mines → all other covered neighbours are safe.
2. **Subset** – constraint A's cells ⊂ constraint B's cells → B \ A holds
   `kB − kA` mines (covers the 1-1 and 1-2 patterns). Also the general *overlap* form
   (bounds on the shared cells) for two overlapping constraints.
3. **Frontier enumeration** – split the frontier (covered cells next to numbers) into
   independent groups, enumerate all consistent mine placements per group (backtracking,
   groups up to ~24 cells; otherwise skip), cells that are safe/mine in every placement are
   deduced.
4. **Mine count** – in the endgame, combine the group placements with the remaining mine
   count (including cells that touch no number).

The solver returns the deduced cells plus the technique and the constraint(s) used – the
same record feeds hints and grading. It never guesses: if no technique applies, it reports
*stuck*.

### Generator (`generator.ts`)

1. Choose the start cell (seeded, preferring inner cells), keep it and its 8 neighbours free
   of mines, place the mines uniformly at random over the remaining cells.
2. Reveal the start area and run the solver. If it solves the board → done.
3. If stuck: move one mine from a cell next to the unresolved part to a random cell outside
   the start area and away from the frontier, and run the solver again (*repair* step).
   After a budget of repairs, start over with the next seed from the RNG.
4. Check the grade against the difficulty window (e.g. Expert must need technique 3 or 4 at
   least a few times; Easy must not need more than technique 1). Reject and retry otherwise.

Deterministic per seed (`core/rng.ts`). Runs in a worker (`generator.worker.ts`,
`core/worker.ts`) behind a puzzle pool (`mines:pool:v1`, `core/pool.ts`).

Solvable by the solver from the start area ⇒ the board is logically determined, i.e. the
player never has to guess (uniqueness of the mine layout given the information available).

### Rules (`rules.ts`)

Pure functions: `reveal`, `flag`, `chord`, flood fill (iterative, no recursion), win and
loss detection, `undoHit`, `checkFlags` (returns wrong flags). Neither the rules nor the
solver import Vue.

## 5. UI

- **Lobby** (`#/mines`): continue, difficulty list (size, mines, best time); rules first for
  new players, below the list afterwards (like the other games).
- **Board**: covered cells raised, revealed cells flat; numbers 1–8 with their own palette
  (light and dark variants, readable with colour-vision deficiencies – numbers are the
  primary signal, colour is a bonus). Original SVG for mine and flag. The start area is
  revealed with a short fade-in.
- **Input on touch**:
  - Tool toggle *Reveal* / *Flag* in the toolbar (like *Fill* / *Cross* in Nonogram) –
    a tap does what the tool says.
  - **Long press** (≈ 350 ms, setting, default on) does the other action – with a visual
    progress ring, cancelled when the finger moves.
  - Tap on a revealed number = chord (setting).
  - Hit testing via `data-cell` + `elementFromPoint`, as in the other games.
- **Desktop / keyboard**: left click reveal, right click flag; arrow keys move a focus
  cursor, `Enter`/`Space` reveal, `F` flag, `C` chord.
- **HUD**: mines left (mines − flags), timer.
  **Toolbar**: tool toggle, Hint, Check, Restart (confirm).
- **Hint**: highlights the next logical step with the involved number(s) and a short
  explanation, e.g. *"The 2 in row 4 already touches 2 flags – its other neighbours are
  safe."* or *"Of the cells next to the 1 and the 2, exactly one more mine must be in the
  cell on the right."*; *Apply* performs the step. A wrong flag is pointed out first. Counts
  as a hint.
- **Check** (shared behaviour, `core/check.ts`): crosses out wrong flags and counts them as
  mistakes.
- **Mine hit** → dialog from §1. **Win** → result dialog (time, mistakes, hints, new best)
  with New game · Mines menu · Home.
- Reduced motion: no flood-fill cascade or explosion animation, instant state changes.
- Must fit 360×640: 12×18 at ≈ 27 px cells plus HUD/toolbar; no pinch zoom in v1.
- Accessibility: `role="grid"`, each cell with an `aria-label` (*covered*, *flag*,
  *3 mines nearby*), focus cursor visible, axe-clean.

## 6. Settings (`riddles:mines:settings`)

| Setting             | Default | Effect                                                       |
| ------------------- | ------- | ------------------------------------------------------------ |
| `longPressAction`   | on      | Long press does the other tool's action                      |
| `chord`             | on      | Tap on a satisfied number reveals its other neighbours       |
| `instantMistakes`   | off     | Wrong flags are shown and counted right away (as in Nonogram) |

## 7. Statistics & storage

- Variants = difficulties, `statKind: 'time'`.
- `recordStart` when the first move is made, `recordFinish({ timeMs })` on a win; a lost
  board that is abandoned counts as started, not finished.
- Keys: `mines:current:v1` (saved only after the first action), `mines:pool:v1`,
  `riddles:mines:settings`. All part of the JSON export/import.

## 8. Integration

Follow *Adding a game* in `docs/development.md`:

- `src/games/mines/` with `index.ts` (descriptor), `routes.ts`, `i18n.ts` (en + de),
  `module.ts`, `settings.ts`, `pool.ts`, `generator.worker.ts`, `palette.ts`,
  components `MinesLobby.vue`, `MinesPlay.vue`, `MinesBoard.vue`, `MinesRules.vue`,
  `MinesSettings.vue`.
- Register in `src/games/modules.ts` (appended at the end of the default order).
- Accent colour `--game-mines` in `tokens.css`, artwork in `components/GameArt.vue`.
- Docs: `docs/games/mines.md`, README game table and docs links, `CHANGELOG.md`.
- E2E: the home page game count follows `gameModules` automatically; add an accessibility
  check of the Mines lobby and play view.

## 9. Tests

- **Solver**: each technique on hand-made positions; against a brute-force enumeration on
  small random boards (≤ 5×5): every deduction of the solver is true in all consistent
  layouts, and the solver never deduces something that is not forced.
- **Generator** per difficulty and several seeds: mine count and size correct, start area
  mine-free and ≥ 9 cells, solver solves the board from the start area, grade within the
  window, deterministic per seed, generation within the attempt budget.
- **Rules**: reveal (number, 0 with flood fill, mine), flag toggle, chord (correct and with
  a wrong flag), win detection, auto-flag on win, mine hit + undo counts a mistake, check
  finds wrong flags.
- **Hints**: always a correct step; solving a board only via hints ends in a win.
- **Components**: tool toggle, long press, chord, mine-hit dialog (undo / try again),
  solve via hints to the result dialog, save only after the first action, resume.

## 10. Open questions

- Hexagonal or wrap-around variants – out of scope for v1.
- Pinch zoom for larger boards (e.g. a 16×30 "Classic" variant on tablets) – only if asked.
- Whether *Undo move* after a mine hit should be limited (e.g. 3 per board like Arrows'
  lives) – start unlimited but counted; revisit after playtesting.
