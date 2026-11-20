# Crowns

Crowns is a logic puzzle on an N×N grid that is divided into N coloured regions.
The genre is also known as *Star Battle* (with one star per unit).

## Rules

- Place exactly one crown in every **row**, every **column** and every **region**.
- Crowns must not **touch** each other – not even diagonally.

Every generated puzzle has exactly one solution, and it can always be found by logic
alone – no guessing required.

| Difficulty | Grid size  | Logic needed (see [Logic levels](#logic-levels)) |
| ---------- | ---------- | ------------------------------------------------ |
| Easy       | 6×6        | levels 1–2                                       |
| Medium     | 7×7 or 8×8 | levels 2–3                                       |
| Hard       | 9×9        | levels 3–4                                       |
| Expert     | 10×10      | level 4                                          |

## Controls

| Action                  | Effect                                                         |
| ----------------------- | -------------------------------------------------------------- |
| Tap a cell              | cycles empty → ✕ (no crown here) → crown → empty               |
| Drag from an empty cell | marks every empty cell along the way with ✕                    |
| Drag from a ✕ cell      | removes ✕ marks along the way (crowns are never changed)       |
| Keyboard                | arrow keys move the cursor, Enter / Space acts like a tap      |
| Hint                    | explains the next logical step; *Apply* performs it            |
| Clear                   | removes all crowns and marks (timer keeps running)             |
| Undo (↶ / Ctrl+Z)       | reverts the last step; a tap, a whole drag stroke, *Clear* and an applied hint are one step each; unlimited (last 500 steps are kept) |

Settings (Settings → Crowns):

- **Show blocked cells** (default on) – a small dot marks cells that cannot hold a crown
  because of the crowns already placed. The dots are computed, not stored: removing a
  crown brings the cells back.
- **Show conflicts** (default on) – crowns that share a row, column or region with another
  crown, or touch one, are drawn in red.

The puzzle is solved as soon as N crowns are on the board without any conflict. The timer
pauses while the app is in the background. The result dialog offers *New game*, *Crowns
menu* and *Home*.

The rules are shown at the top of the Crowns menu for first-time players; once a game has
been started they move below the difficulty list.

## Generator

Source: `src/games/crowns/logic/generator.ts`. Generation is deterministic per seed (all
randomness comes from `core/rng.ts`) and runs in a Web Worker (`generator.worker.ts`). A
prefetch pool (`core/pool.ts`) keeps one puzzle per difficulty ready, so starting a game is
usually instant.

1. **Crowns.** A random permutation `col[row]` with `|col[r] − col[r+1]| ≥ 2` is built by
   randomised backtracking. This is the solution.
2. **Regions.** Every crown cell seeds one region. Regions grow one cell at a time into
   unassigned orthogonal neighbours. The region to grow is chosen with weight
   `appetite / size`, where each region gets a random appetite – this mixes small and large
   regions. Half of the time a region continues next to the cell it added last, which
   produces snake-like shapes. Regions are always contiguous.
3. **Uniqueness repair.** The exact solver (`solver.ts`) looks for a second solution. If one
   exists, a crown cell of that alternative solution that is not a crown in the intended
   solution is moved into an adjacent, different region (only if its old region stays
   contiguous). Afterwards the alternative has two crowns in the receiving region and none
   in the old one, so it is no longer valid, while the intended solution is untouched.
   This repeats until the solution is unique (or gives up after 80 iterations and starts
   over).
4. **Grading.** The logical solver (`logic.ts`) solves the puzzle, always using the simplest
   technique available. Puzzles that need guessing are rejected. The hardest level used must
   fall into the difficulty's window; otherwise a new candidate is generated. After at most
   400 candidates the closest match is used (in practice the window is always hit).
5. Regions are renumbered in reading order so that colours are spread evenly.

The exact solver works row by row with bitmasks for used columns and regions, checks the
"no touching" rule against the previous row and prunes when an unused region has no free
cell left in the remaining rows.

### Generation times

Measured in Node 26 on a desktop CPU, 40 seeds per difficulty:

| Difficulty | Average | Median | Max    |
| ---------- | ------- | ------ | ------ |
| Easy       | 3 ms    | 1 ms   | 24 ms  |
| Medium     | 4 ms    | 3 ms   | 19 ms  |
| Hard       | 10 ms   | 6 ms   | 53 ms  |
| Expert     | 49 ms   | 33 ms  | 198 ms |

Phones are a few times slower, which is still well below a second.

## Logic levels

The logical solver keeps a set of candidate cells. Placing a crown removes its row, column,
region and its eight neighbours from the candidates.

| Level | Technique              | Idea                                                                                                     |
| ----- | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| 1     | **Last free cell**     | A row, column or region has only one candidate left → it gets the crown.                                  |
| 2     | **Confinement**        | All candidates of a region lie in one row/column → the other cells of that line are not crowns. Conversely, if all candidates of a line lie in one region, that region's other cells are not crowns. |
| 3     | **Blocking**           | A crown on a candidate would remove every candidate of some other row, column or region → the candidate is impossible. |
| 4     | **Group confinement**  | *k* regions whose candidates lie within *k* rows (or columns) fill those lines, so all other cells in these lines are eliminated – and the mirrored rule for *k* lines confined to *k* regions (2 ≤ k ≤ m/2, where m is the number of open regions). |

## Hints

`logic/hints.ts`:

1. A crown that is not part of the solution, or a ✕ on a solution cell, is reported first
   ("This crown is not part of the solution"). *Remove it* fixes the cell.
2. Otherwise the player's board is turned into a logic board (✕ marks count as
   eliminations, crowns are placed) and the next logical step is explained. The board
   highlights the unit(s) the step is about, outlines the key cell and previews the change
   (ghost ✕ / crown). *Apply* performs it.

Every hint that shows a step or a mistake counts towards *Hints* in the result dialog.

## Storage

| Key (prefix `riddles:`) | Content                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `crowns:current:v1`     | running game: puzzle, cells (0 empty, 1 ✕, 2 crown), elapsed time, hints used, undo history (changed cells per step; optional for older saves) |
| `crowns:pool:v1`        | one prefetched puzzle per difficulty                         |
| `crowns:settings`       | `autoMark`, `showConflicts`                                  |
| `stats:v1` → `crowns`   | statistics per difficulty (started, solved, best/total time) |

The running game is saved after every move, every few seconds, and when the app goes to the
background.

## Files

```
src/games/crowns/
  index.ts             descriptor for the app shell (variants, stats, settings)
  routes.ts            #/crowns (lobby) and #/crowns/play
  i18n.ts              English and German texts
  CrownsLobby.vue      rules, continue, difficulty list
  CrownsPlay.vue       game screen: timer, board, hints, result dialog
  CrownsBoard.vue      grid rendering, tap / drag / keyboard input
  CrownGlyph.vue       crown symbol
  CrownsRules.vue      rules text
  CrownsSettings.vue   settings section
  hintText.ts          hint → translated explanation
  palette.ts           region colours (light / dark)
  pool.ts              worker client + prefetch pool
  settings.ts          persisted settings
  generator.worker.ts  worker entry
  logic/               types, geometry, rules, exact solver, logical solver, generator, hints
```
