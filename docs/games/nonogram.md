# Nonogram

Fill the cells of a grid so that every row and column matches its clue. A clue lists the
lengths of the filled blocks in that line, in order; blocks are separated by at least one
empty cell (a clue `0` means the line stays empty). Every puzzle is generated on the device,
has exactly one solution and can be solved by logic alone.

## Difficulties

| Difficulty | Grid (columns × rows) | Filled cells | Minimum solver passes |
| ---------- | --------------------- | ------------ | --------------------- |
| Easy       | 5 × 5                 | 52–68 %      | 1                     |
| Medium     | 10 × 10               | 48–62 %      | 4                     |
| Hard       | 15 × 15               | 45–58 %      | 5                     |
| Expert     | 15 × 20 (portrait)    | 45–58 %      | 6                     |

Expert is portrait instead of 20 × 15: twenty columns plus row clues do not fit a 360 px wide
phone with usable cell sizes (≈ 17–19 px cells at 360 × 640).

## Controls

| Action              | Effect                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Tool *Fill* / *Cross* | chooses what a tap does (keyboard: `F` / `X`)                        |
| Tap a cell          | sets the tool's mark; tapping the same mark again clears it            |
| Drag                | paints a straight line in the row or column of the first move; only cells that had the start cell's mark are changed (so filling never overwrites crosses and vice versa) |
| Undo (↶ / Ctrl+Z)   | reverts the last tap/stroke, hint or restart; unlimited (last 500 steps are kept) |
| Hint                | shows the next deduction (see below), *Apply* performs it             |
| Restart             | clears all marks (asks first)                                          |
| Keyboard            | arrow keys move the cursor, Enter / Space mark with the current tool   |

Satisfied clues turn grey; thicker guide lines mark every fifth row and column; the row and
column of the touched cell are tinted (setting). With **Show mistakes** (default on) wrong
marks are drawn in red (fills striped) and counted; with it off, mistakes are only revealed by
hints. The puzzle is solved when exactly the solution cells are filled – crosses don't matter.
The result dialog offers *New game*, *Nonogram menu* and *Home*.

## Line solver

`logic/lineSolver.ts` solves one line: for a clue and the known cells (unknown / empty /
filled) it returns the cells that have the same value in **every** placement of the blocks.
Two dynamic-programming tables – "blocks 0…j-1 fit into the first i cells" (forward) and
"blocks j… fit into cells i…" (backward) – give, in O(n·k), for every cell whether it can be
filled (inside some valid block placement) and whether it can be empty. A line without any
valid placement is a contradiction. The implementation is checked against brute force on
random short lines.

`logic/solver.ts` repeats the line solver over all rows and columns (only lines whose cells
changed are revisited) until nothing changes. If that determines every cell, the puzzle has
exactly one solution and needs no guessing. The number of sweeps ("passes") is used as a
rough difficulty measure.

## Generator

1. Seeded random noise with the target density, smoothed by one or two majority rounds of a
   cellular automaton into organic blobs, sometimes mirrored for a symmetric motif.
2. Density is adjusted into the difficulty's range; patterns with more than 10 % empty lines
   are rejected.
3. While line logic leaves cells undetermined, a random undetermined cell of the pattern is
   flipped and the clues are recomputed – this removes ambiguity step by step.
4. Puzzles below the difficulty's minimum number of passes are kept only as a fallback; the
   attempt count is bounded and everything is deterministic per seed.

Generation runs in a Web Worker; a prefetch pool keeps one puzzle per difficulty ready.
Measured in Node (20 seeds each): Easy 0.2 ms avg / 1.2 ms max, Medium 0.7 / 4.4 ms,
Hard 3.0 / 17 ms, Expert 5.3 / 23 ms.

## Hints

1. If any mark contradicts the solution (a fill on an empty cell or a cross on a filled one),
   the hint highlights all of them and offers to remove them.
2. Otherwise the line solver runs on every row and column with the player's marks as known
   cells; the line that reveals the most new cells is shown (highlighted clue and cells), with
   the explanation "in every way the blocks fit, these cells are filled / empty". *Apply* sets
   the marks. Every requested hint is counted.

## Storage

| Key (prefix `riddles:`)   | Content                                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| `nonogram:current:v1`     | running game: puzzle, marks (0 unknown, 1 filled, 2 cross), elapsed time, hints, mistakes, undo history (changed cells per step) |
| `nonogram:pool:v1`        | one prefetched puzzle per difficulty                                      |
| `nonogram:settings`       | `checkMistakes`, `highlightLines`                                         |
| `stats:v1` → `nonogram`   | statistics per difficulty (started, solved, best/total time)              |

The running game is saved after every change, every few seconds, and when the app goes to
the background.

## Files

```
games/nonogram/
  index.ts  routes.ts  i18n.ts  settings.ts  pool.ts  generator.worker.ts
  NonogramLobby.vue  NonogramPlay.vue  NonogramBoard.vue  NonogramRules.vue  NonogramSettings.vue
  logic/ types.ts lines.ts lineSolver.ts solver.ts generator.ts rules.ts history.ts hints.ts
  logic/__tests__/  __tests__/
```
