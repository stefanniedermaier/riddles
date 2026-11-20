# Sudoku

Sudoku in two grid sizes – **Classic 9×9** with four difficulty levels and **Mini 6×6** with
three – with notes, unlimited undo and hints that explain the next logical step. Every puzzle
is generated on the device, has exactly one solution and can be solved by logic alone,
without guessing.

## Rules

| Grid          | Digits | Boxes                     |
| ------------- | ------ | ------------------------- |
| Classic 9×9   | 1–9    | nine 3×3 boxes            |
| Mini 6×6      | 1–6    | six boxes of 2 rows × 3 columns |

Fill the grid so that every row, every column and every box contains each digit exactly
once. Some digits (the *givens*) are fixed from the start.

The grid is chosen with the switch at the top of the Sudoku menu; the choice is remembered.
Each grid has its own running game, puzzle pool and statistics.

## Controls

| Action                    | Touch                                    | Keyboard              |
| ------------------------- | ---------------------------------------- | --------------------- |
| Select a cell             | tap the cell                             | arrow keys            |
| Enter a digit             | tap a digit on the number pad            | `1`–`9`               |
| Remove a digit            | tap the same digit again, or **Erase**   | `Backspace`, `Delete`, `0` |
| Notes mode on/off         | **Notes**                                | `N`                   |
| Hint                      | **Hint**                                 | `H` (`Esc` closes it) |
| Undo                      | **Undo**                                 | `Ctrl`/`⌘` + `Z`      |
| Menu (new game, clear …)  | ⋮ in the app bar                         | –                     |

- In **notes mode**, digits toggle small candidate marks in the selected cell.
- Placing a digit removes it from the notes of every cell in the same row, column and box
  (setting *Remove notes automatically*).
- The number pad shows how many of each digit are still missing; a digit that is on the
  board nine times is disabled.
- Tapping a given selects it, which highlights all cells with the same digit.
- Entries are **not** checked automatically. Wrong entries are only reported when you ask
  for a hint.
- The timer pauses while the app is in the background and while the menu is open.
- **Undo** reverts the last board change, step by step and without limit: entering or
  removing a digit (including the notes cleaned up automatically by it), toggling a note,
  erasing, applying a hint and *Clear entries*. The undo history is saved with the game, so
  it survives a reload. Undo does not stop the timer and does not reduce the hint count.
- After solving, the result dialog offers *New game*, *Choose difficulty* and *Home*.

### Settings

| Setting                         | Default |
| ------------------------------- | ------- |
| Highlight row, column and box   | on      |
| Highlight same digits           | on      |
| Remove notes automatically      | on      |

(The last chosen grid is stored in the same settings object as `lastMode`.)

## Difficulty levels

The difficulty is the hardest solving technique a human needs. Technique levels:

| Level | Techniques                                         | Weight     |
| ----- | -------------------------------------------------- | ---------- |
| 1     | Hidden single, naked single                        | 1          |
| 2     | Pointing, box/line reduction (claiming)            | 3          |
| 3     | Naked pair/triple, hidden pair/triple              | 5 / 7, 6 / 8 |
| 4     | X-Wing, XY-Wing, Swordfish                         | 10, 12, 14 |

| Difficulty | Required level | Clues (typical) |
| ---------- | -------------- | --------------- |
| Easy       | 1              | 36–42           |
| Medium     | 2              | 27–35           |
| Hard       | 3              | 23–31           |
| Expert     | 4              | 22–30           |

A puzzle of a given difficulty *needs* at least one technique of that level and never needs
a harder one.

### Mini 6×6

On a 6×6 grid almost every puzzle falls to singles: in a measurement of 300 maximally dug
grids, 98 % needed nothing beyond level 1. The technique level can therefore not separate
difficulties. Mini difficulties are defined by the **number of givens** instead (fewer
clues mean longer chains of singles and fewer places to start):

| Difficulty | Givens | Techniques allowed |
| ---------- | ------ | ------------------ |
| Easy       | 16     | singles            |
| Medium     | 12     | singles            |
| Hard       | 8–10 (practically always 10) | any (levels 1–4) |

Clues are removed in symmetric pairs, so clue counts are even. Generation takes about 1 ms on
average (max. ≈ 10 ms) per puzzle.

### Techniques

- **Naked single** – a cell has only one candidate left.
- **Hidden single** – a digit fits into only one cell of a row, column or box.
- **Pointing** – inside a box, a digit's candidates all lie on one row/column, so the digit
  can be removed from the rest of that line.
- **Box/line reduction** – on a row/column, a digit's candidates all lie in one box, so the
  digit can be removed from the rest of that box.
- **Naked pair / triple** – *n* cells of a unit contain only the same *n* candidates; those
  digits can be removed from the other cells of the unit.
- **Hidden pair / triple** – *n* digits of a unit fit only into the same *n* cells; all other
  candidates can be removed from these cells.
- **X-Wing / Swordfish** – in 2 (3) rows a digit is limited to the same 2 (3) columns (or
  vice versa), so it can be removed from the rest of those columns.
- **XY-Wing** – a pivot {a,b} sees two pincers {a,c} and {b,c}. Whatever the pivot is, one
  pincer becomes c, so c can be removed from every cell that sees both pincers.

## Generator

Source: `src/games/sudoku/logic/`. All logic is size-independent: the grid geometry
(`board.ts`, `geometry(size)`) is derived from the number of cells (81 or 36), so puzzles and
saves need no extra size field.

1. **Complete grid** – an exact bitmask backtracking solver (`solver.ts`, most constrained
   cell first) fills an empty grid with a randomly ordered digit sequence.
2. **Digging** – clues are removed in random pairs with 180° rotational symmetry. A removal
   is kept only if
   - the puzzle still has exactly one solution (`countSolutions`, fast exact check), and
   - the human-style solver (`grader.ts`) still solves it using techniques up to the target
     level.
3. **Stop** – digging stops when the clue count drops below a random target in the
   difficulty's range *and* the target level is required, or when no further clue can be
   removed (or a floor is reached).
4. **Accept** – the puzzle is accepted if its hardest required level equals the target.
   Otherwise the generator retries with a new grid (seed derived with `hashSeed(seed,
   attempt)`). After the attempt budget the best candidate found so far is used.

Generation is deterministic: the same difficulty and seed always produce the same puzzle.
Typical generation times are well below 100 ms (Easy ≈ 3 ms, Medium/Hard/Expert ≈ 20–30 ms
on average on a desktop CPU), so the attempt budget is rarely touched.

Generation runs in a Web Worker (`generator.worker.ts`, via `core/worker.ts`). The puzzle
pool (`core/pool.ts`) keeps one puzzle per difficulty ready in storage; the lobby fills it
in the background, so a new game usually starts instantly.

## Hints

`logic/hints.ts`, texts in `explain.ts`:

1. If any entry differs from the solution, the hint marks the wrong cells and offers to
   erase them.
2. Otherwise candidates are computed from the placed digits (the player's notes are
   ignored) and the logical solver runs until it finds the next **placement**. The hint shows
   the most advanced preparatory step (e.g. a pointing pair) followed by the placement
   (e.g. a naked single), highlights the involved cells and offers to fill in the digit.
3. If no logical step is found (should not happen for generated puzzles), the hint reveals
   the cell with the fewest candidates.

Every requested hint is counted and shown in the result dialog.

## Storage keys

| Key                          | Content                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| `riddles:sudoku:current:v1`  | running classic game: puzzle, entries, notes (bitmask), time, hints, selection, undo history |
| `riddles:sudoku:mini:current:v1` | running mini game (same format, 36 cells)                |
| `riddles:sudoku:pool:v1`     | one prefetched classic puzzle per difficulty                 |
| `riddles:sudoku:mini:pool:v1` | one prefetched mini puzzle per difficulty                   |
| `riddles:sudoku:settings`    | Sudoku settings (incl. last chosen grid)                     |
| `riddles:stats:v1`           | statistics (shared); variant = difficulty (`easy` …) for classic, `mini-easy` … for mini |

The undo history (`history`: list of `{ changes: [cell, previous value, previous notes][],
selected }`) was added without a key change; saves of older versions simply start with an
empty history.

The running game is saved after every move, every 5 seconds while the timer runs, and when
the app is hidden or closed. It is deleted when the puzzle is solved.

## Code map

| File                        | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| `logic/types.ts`            | types, difficulties, validators for stored data      |
| `logic/board.ts`            | geometry for 9×9 and 6×6 (rows/cols/boxes/peers), bitmask helpers |
| `logic/solver.ts`           | exact solver, solution counting, random full grids   |
| `logic/techniques.ts`       | candidate grid and technique finders                 |
| `logic/grader.ts`           | technique catalogue, `findNextStep`, `gradePuzzle`   |
| `logic/generator.ts`        | difficulty profiles (classic + mini) and puzzle generation |
| `logic/hints.ts`            | hint computation                                     |
| `explain.ts`                | translated hint texts                                |
| `useSudokuGame.ts`          | game state, input, undo, persistence, timer, statistics |
| `generate.ts`               | worker client and one puzzle pool per grid           |
| `SudokuLobby.vue`           | grid switch, continue / difficulty selection         |
| `SudokuPlay.vue`            | play screen, menu, result dialog, keyboard input     |
| `SudokuBoard.vue`           | grid rendering (9×9 / 6×6) and highlighting          |
| `NumberPad.vue`, `HintPanel.vue`, `SudokuSettings.vue` | controls             |
