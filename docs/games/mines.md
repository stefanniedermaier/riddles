# Mines

The classic mine-finding puzzle with one promise: **every board can be solved by logic
alone – you never have to guess** (plan: [plan/13-minesweeper.md](../../plan/13-minesweeper.md)).
Generic mechanic (genre *Minesweeper*); name, artwork and boards are original, every board is
generated on the device.

## Rules

- Reveal every cell that does not hide a mine. A number shows how many of the up to eight
  surrounding cells hide a mine; a cell without adjacent mines opens its neighbours
  automatically.
- The board starts with a **pre-opened start area** (a cell without adjacent mines and its
  flood fill, at least 9 cells). Boards are generated in advance, and only a known start
  makes the "no guessing" guarantee possible.
- **Flags** mark suspected mines. They protect a cell from accidental reveals but are not
  checked while playing (unless *Show wrong flags right away* is on).
- **Chord**: tapping a revealed number that has as many flags around it as it shows reveals
  its other covered neighbours – with a wrong flag this can hit a mine.
- The board is solved when every safe cell is revealed; the mines are then flagged
  automatically.

### Mine hit

Revealing a mine shows all mines (wrong flags crossed out) and a dialog:

| Button       | Effect                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| Undo move    | back to the board before the fatal move; counts as one **mistake**      |
| Try again    | the same board from the start (time reset)                             |
| New board    | a new board of the same difficulty                                     |
| Home         | leave; the hit board stays saved and the dialog is shown again on resume |

## Controls

| Action                    | Effect                                                              |
| ------------------------- | ------------------------------------------------------------------- |
| Tap                       | the selected tool: *Reveal* or *Flag* (toggle in the toolbar)        |
| Long press (≈ 350 ms)     | the other tool; a ring fills while holding, moving the finger cancels |
| Tap on a revealed number  | chord (setting)                                                     |
| Mouse                     | left click = tool, right click = other tool                          |
| Keyboard                  | arrow keys move the cursor, Enter / Space = tool, F = flag           |
| Check                     | marks wrong flags and counts new ones as mistakes (hidden when wrong flags are shown right away) |
| Hint                      | a wrong flag first, otherwise the next logical step with a short explanation; *Apply* performs it |
| Restart                   | the same board from the start (confirmation)                        |

There is no general undo: revealed cells are information, taking them back would make the
puzzle trivial.

Settings (Settings → Mines): **Long press for the other action** (on), **Tap a number to
reveal around it** (on), **Show wrong flags right away** (off).

## Difficulties

At most 12 columns (portrait boards), so cells stay large enough to tap on a phone.

| Difficulty | Board  | Mines | Density | Logic (see below)                         |
| ---------- | ------ | ----- | ------- | ----------------------------------------- |
| Easy       | 8×10   | 12    | 15 %    | technique 1 only                           |
| Medium     | 9×13   | 22    | 19 %    | ≥ 2 × technique 2, no 3/4                  |
| Hard       | 10×16  | 35    | 22 %    | ≥ 8 × technique 2/3, at most 2 × 3/4       |
| Expert     | 12×18  | 50    | 23 %    | ≥ 2 × technique 3/4 and ≥ 8 × technique 2  |

Easy to Hard always hit their window; for Expert the closest of 40 boards is used when
none fits exactly (about half of the boards need technique 3/4 only once).

## Solver (`logic/solver.ts`)

Works only on what a player can see: revealed numbers, known mines and the total mine count.
Every revealed number gives a constraint *exactly k mines among these unknown cells*.

1. **Single number** – k = 0 → the cells are safe; k = number of cells → all are mines.
2. **Two numbers** – for two overlapping constraints the mines in the shared cells are
   bounded from both sides, which can fix the cells outside the overlap (1-1 / 1-2 patterns).
3. **Arrangements** – the constraints are split into independent groups; all mine
   arrangements of a group are enumerated (node budget 200 000). Cells that are safe or a
   mine in every arrangement are deduced.
4. **Mines left** – the arrangements of all groups are combined with the number of mines
   left, including cells no number touches.

`findStep` returns the deduction of the easiest technique that finds one; it never guesses.
Hints use the same function on the player's board (correct flags count as known mines).

## Generator (`logic/generator.ts`)

1. Pick a start cell away from the edges, keep it and its neighbours free, place the mines at
   random elsewhere.
2. Solve from the start area with the solver.
3. When the solver is stuck, move one mine next to the unsolved part to a covered cell away
   from it and solve again (at most 120 repairs, then a fresh layout).
4. Keep the solvable board whose technique profile fits the difficulty best.

Deterministic per seed, runs in a worker behind a puzzle pool. Generation takes a few ms for
Easy/Medium, ≈ 80 ms for Hard and ≈ 350 ms for Expert (desktop, Node).

## Storage

| Key                    | Content                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `mines:current:v1`     | running attempt: board, cell states, moves, time, hints, mistakes, last check, mine hit + board before it – saved only after the first move |
| `mines:pool:v1`        | one prefetched board per difficulty                                     |
| `mines:settings`       | the three settings above                                                |

Statistics per difficulty: a board counts as started with the first move and as finished
when solved (time = best time). An abandoned hit board counts as started only.

## Tests

`logic/__tests__`: every technique on hand-made positions; 1 500 random positions against a
brute-force enumeration (every deduction holds in all consistent layouts, the easiest
technique is used, all four techniques occur); generator per difficulty (valid, start area
mine-free and ≥ 9 cells, solvable, grade window, deterministic); rules (reveal, flood fill,
flags, chord incl. wrong flag, win); hints (wrong flags first, a whole Easy and Expert board
solved by hints alone). Component tests for the board (labels, tap, long press, cancel,
right click, keyboard), the lobby and the play view (save after the first move, mine hit +
undo, check, solved via hints).
