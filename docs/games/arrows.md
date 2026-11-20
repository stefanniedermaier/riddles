# Arrows

An ordering puzzle (plan: [plan/10-arrows.md](../../plan/10-arrows.md)). The board is full of
arrows. Tap an arrow and it slides out of the board in the direction it points – but only if
nothing is in its way. Find an order that clears the whole board. Name, artwork and puzzles
are original; every puzzle is generated on the device.

## Rules

- Every arrow covers 1–6 orthogonally connected cells (straight or bent). The head is at one
  end; it points in the direction of the last segment.
- An arrow can leave when every cell on the straight line from its head to the board edge
  is free. Its body follows the head out of the board.
- Tapping a blocked arrow makes it bump into the first arrow in its way: both flash and you
  lose one of your **3 hearts**. With no hearts left the attempt fails.
- The puzzle is solved when the board is empty. There is always a solution.

## Controls

| Action                  | Effect                                                                 |
| ----------------------- | ---------------------------------------------------------------------- |
| Tap an arrow            | it leaves the board, or bumps (−1 heart). A tap counts when finger down and up are on the same arrow. |
| Keyboard                | arrow keys move the cursor, Enter / Space taps                          |
| Hint                    | highlights an arrow that can leave now (counted as a hint)              |
| Restart                 | starts the same puzzle again with 3 hearts (confirmation)              |

There is **no undo** – it would make the hearts meaningless.

After a failure the result dialog offers *Try again* (same puzzle), *New puzzle* and *Home*;
after a win *New game*, *Arrows menu* and *Home*.

Settings (Settings → Arrows): **Show what blocks an arrow** (default on) – after a bump, the
cells between the arrow and the blocking arrow light up briefly.

## Difficulties

| Difficulty | Board  | Arrows | Dependency depth | Coverage |
| ---------- | ------ | ------ | ---------------- | -------- |
| Easy       | 6×6    | 8–13   | 3–4              | ≥ 80 %   |
| Medium     | 8×8    | 14–22  | 5–6              | ≥ 82 %   |
| Hard       | 10×10  | 22–32  | 7–9              | ≥ 82 %   |
| Expert     | 12×12  | 32–52  | ≥ 8              | ≥ 80 %   |

*Dependency depth* is the length of the longest chain "A can only leave after B left".
In tests every one of 40 seeds per difficulty hit all windows.

## Generator (`logic/generator.ts`)

The board is built in **reverse removal order**: each new arrow is placed so that its exit
ray (head → edge) crosses none of the arrows placed before it. Removing the arrows in the
reverse placement order is therefore always possible – every puzzle is solvable by
construction. Later arrows usually sit on the rays of earlier ones, which creates the
dependency chains.

1. Pick a random free cell as head and a direction whose ray is free.
2. Grow the body backwards: the cell behind the head fixes the last segment's direction,
   further cells follow a random walk (preferring tight spots to avoid isolated holes) and
   never enter the arrow's own ray. Lengths are weighted towards 2–4 cells.
3. Repeat until the arrow limit is reached or no arrow fits any more.
4. Shuffle the arrow ids, grade the board (arrow count, depth, coverage) and accept it when
   it lies inside the difficulty windows; otherwise try the next candidate (up to 300, then
   the closest one is used).

Generation is deterministic per seed and runs in a Web Worker with a prefetch pool.

Generation time (Node, 40 seeds per difficulty):

| Difficulty | Ø       | max     |
| ---------- | ------- | ------- |
| Easy       | 0.4 ms  | 3.5 ms  |
| Medium     | 1.6 ms  | 4.6 ms  |
| Hard       | 13 ms   | 68 ms   |
| Expert     | 100 ms  | 283 ms  |

## Analysis and hints (`logic/analysis.ts`, `logic/rules.ts`)

- `rayCells`, `blockerOf` – the cells in front of a head and the first arrow on them.
- `dependencies` / `dependencyDepth` – which arrows have to leave first; the longest chain
  (cycles = unsolvable, reported as `Infinity`).
- `solveOrder` – removes free arrows greedily. Removing an arrow only ever frees cells, so
  the greedy order succeeds exactly when the board is solvable.
- `tapArrow` – exit or bump (with the blocker), lives, failure, completion.
- `hintArrow` – an arrow that can leave now; among those, the one whose departure frees the
  most other arrows. Following hints always solves the puzzle.

## Storage keys

| Key (prefix `riddles:`) | Content                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `arrows:current:v1`     | running attempt: puzzle, removed arrow ids, hearts, taps, elapsed time, hints – saved only after the first tap |
| `arrows:pool:v1`        | one prefetched puzzle per difficulty                                     |
| `arrows:settings`       | `showBlockedPath`                                                        |
| `stats:v1` → `arrows`   | per difficulty: started (first tap of every attempt), solved, best/total time |

## Files

```
src/games/arrows/
  index.ts  routes.ts  i18n.ts  settings.ts  palette.ts  pool.ts  generator.worker.ts
  ArrowsLobby.vue  ArrowsPlay.vue  ArrowsBoard.vue  ArrowsRules.vue  ArrowsSettings.vue
  logic/ types.ts  analysis.ts  rules.ts  generator.ts
  logic/__tests__/ helpers.ts  analysis.test.ts  rules.test.ts  generator.test.ts
  __tests__/ ArrowsPlay.test.ts  ArrowsLobby.test.ts  ArrowsBoard.test.ts
```
