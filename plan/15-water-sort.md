# Plan 15 – Water Sort

A sorting puzzle (genre *colour sort*): tubes hold layers of coloured water. Pour from tube to
tube until every tube holds only one colour. Name, artwork and levels are original and
generated.

## 1. Rules

- Every tube holds up to **4 layers**. There are *n* colours with 4 layers each, in *n* tubes,
  plus **2 empty tubes**.
- Tap a tube to pick it up, tap another tube to pour: the **top run** of equal layers moves
  over, as many as fit, but only onto an **empty tube or the same colour**.
- Solved when every tube is either empty or full with one colour.
- **Undo** is unlimited (counts as a move). Restart puts the level back to the start.

## 2. Difficulty

| Difficulty | Colours | Tubes |
| ---------- | ------- | ----- |
| Easy       | 4       | 6     |
| Medium     | 6       | 8     |
| Hard       | 9       | 11    |
| Expert     | 12      | 14    |

Tubes are laid out in up to two rows (max. 7 per row) so they fit a 360 px screen.

## 3. Generator & solver (`logic/`)

- **Generator**: shuffle 4 × *n* layers into *n* tubes (seeded). Reject if a tube is already
  sorted or more than two layers of one colour sit on top of each other anywhere at the start.
  Check solvability with the solver; retry otherwise. Deterministic per seed. (As implemented:
  a few milliseconds even for Expert, so it runs on the main thread without worker or pool.)
- **Solver**: depth-first search over canonical states (tubes sorted for the visited set),
  pruning useless moves (pouring a complete single-colour tube into an empty tube, pouring
  back the move just made). Moves that complete a tube or pour onto the same colour are tried
  first. Node budget; returns a move list.
- **Hint**: run the solver from the current state: show the next move (both tubes highlighted,
  *Apply* pours). Following hints walks along the same solution, so hints always reach the
  goal. If the current state is a dead end: "No way out from here – undo some moves".

## 4. UI

- Lobby (`#/watersort`): continue, difficulty list (colours, best time), rules.
- Board: tubes as rounded SVG/CSS columns, layers as coloured blocks; the selected tube lifts.
  Pouring animates the moved layers (≈ 250 ms; reduced motion: instant).
- Colours: 12 clearly distinguishable colours in both themes. Setting **Show symbols**
  (default off) puts a letter on every layer for colour-blind players.
- HUD: difficulty, moves, sorted tubes. Toolbar: Undo, Hint, Restart (confirm).
- Keyboard: the tubes are buttons (Tab, Enter/Space).
- Win → result dialog (time, moves, hints, new best).

## 5. Statistics & storage

Variants = difficulties, `statKind: 'time'`. Keys `watersort:current:v1` (after the first
move), settings `watersort:settings`.

## 6. Tests

Pour rules (run moves, capacity, only onto same colour/empty), solved detection, generator
(colour counts, solvable by the solver, not pre-sorted, deterministic), solver returns a valid
move list that solves the level, hint after a dead end reports it. Component tests: select
and pour, undo, save after the first move, solve via hints.
