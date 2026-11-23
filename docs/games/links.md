# Links

A path-connection puzzle (genre: *Numberlink*). Pairs of coloured dots lie on an N×N grid.
Connect every pair with a line so that lines never cross or branch **and every cell of the
board is filled**. Every puzzle is generated on the device and has exactly one solution.

## Difficulties

| Difficulty | Size  | Colours |
| ---------- | ----- | ------- |
| Easy       | 5×5   | 4–5     |
| Medium     | 7×7   | 6–7     |
| Hard       | 9×9   | 7–9     |
| Expert     | 11×11 | 10–12   |

Expert needs at least 10 pairs: with fewer, an 11×11 grid rarely has a unique solution
(measured: 9 pairs → 3 of 15 puzzles ambiguous, ≈ 22 s generation).

## Controls

| Action                         | Effect                                                              |
| ------------------------------ | ------------------------------------------------------------------- |
| Drag from a dot                | draws that colour's line (starting anew from this dot)              |
| Drag from the end of a line    | continues the open line                                             |
| Drag from inside a line        | continues from there; the rest of the line is removed               |
| Drag back over the own line    | shortens it                                                         |
| Draw through another line      | cuts that line; pulling back in the same drag restores it           |
| Reach the other dot            | connects the colour (the line pulses); it cannot grow any further   |
| Undo (↶ / Ctrl+Z)              | reverts the last drag, hint or restart; unlimited (last 300 steps kept) |
| Hint                           | draws the solution line of one colour (open colours first), cutting lines in its way |
| Restart                        | removes all lines (with confirmation)                               |

The header shows connected colours, filled cells (%) and **moves**: a drag counts as a move
when it changes a different colour than the previous drag. Solving with exactly one move per
colour and without hints is **perfect**. The result dialog shows time, moves, hints and offers
*New game*, *Links menu* and *Home*.

Settings → Links → **Letters on dots** shows a letter (A–L) on every dot, so colours can be
told apart without colour vision. The 12-colour palette (`palette.ts`) has light and dark
variants of the same colour families, chosen for a minimum pairwise CIEDE2000 distance of
22.8 (light) / 20.7 (dark) and at least 3:1 contrast to the board; the most distinct colours
come first, so smaller puzzles only use those.

The rules are shown at the top of the Links menu for first-time players and below the
difficulty list afterwards.

## Generator (`logic/generator.ts`)

1. **Tiling:** cover the grid randomly with paths of one or two cells.
2. **Reduce:** repeatedly *merge* two paths whose ends touch – only if the merged path does not
   touch itself (no two non-consecutive cells of one path are neighbours). Tight paths make
   alternative solutions much rarer. When no merge is possible, a *shift* lets a path end take
   over the adjacent piece of a neighbouring path (same number of paths, but ends move), which
   opens up new merges. Paths shorter than 3 cells grow by shifts as well.
3. **Uniqueness:** the exact solver looks for a second solution (node budget 20–30k). If one is
   found, a path that differs in it is split into two colours at a joint the alternative does
   not use; if the search is inconclusive, the longest path is split near its middle. Each split
   adds a colour, so generation starts slightly below the difficulty's colour range and stops
   once the puzzle is proven unique within the range.
4. Colours are shuffled and each line's direction (`a` → `b`) is random.

Everything is deterministic for a seed (`core/rng.ts`). Generation runs in
`generator.worker.ts`; `pool.ts` keeps one puzzle per difficulty ready.

Measured (Node 26, 20 seeds each, main thread), every result re-checked for uniqueness with a
2-million-node budget:

| Difficulty | Average | Max     |
| ---------- | ------- | ------- |
| Easy       | 0.7 ms  | 3 ms    |
| Medium     | 1.1 ms  | 6 ms    |
| Hard       | 87 ms   | 215 ms  |
| Expert     | 964 ms  | 2.9 s   |

## Solver (`logic/solver.ts`)

Each colour grows from both of its dots; the head with the fewest possible moves is extended
first (forced moves first). Pruning at every node:

- a free cell must still be able to become the interior of a line (two usable neighbours: free
  cells or heads; or both heads of one colour),
- the two heads of every unfinished colour must touch or share a free region,
- every free region must be reachable by both heads of at least one unfinished colour.

A solution must connect every colour and cover all cells. `solve(size, endpoints, { limit,
maxNodes })` returns up to `limit` solutions and whether the node budget ran out. The tests
compare it with an independent brute force on random 3×3/4×4 puzzles.

## Rules (`logic/rules.ts`)

Pure functions for strokes (`beginStroke`, `extendStroke`, `strokePaths`), state
(`isConnected`, `coveredCells`, `isSolved`), hints (`hintColor`, `applyHint`) and move counting
(`countMove`). During a drag, other colours' lines are derived from their state at drag start
and cut at the first cell the new line uses – that is why cut lines come back when pulled back.

## Storage

| Key (prefix `riddles:`) | Content                                                                   |
| ----------------------- | ------------------------------------------------------------------------- |
| `links:current:v1`      | running game: puzzle, lines, elapsed time, hints, moves, last colour, undo steps (previous lines) |
| `links:pool:v1`         | one prefetched puzzle per difficulty                                      |
| `links:settings`        | `showLabels`                                                              |
| `stats:v1` → `links`    | statistics per difficulty (started, solved, best/total time)              |

The running game is saved after every change, every few seconds and when the app goes to the
background.

## Files

```
games/links/
  index.ts  routes.ts  i18n.ts  settings.ts  palette.ts  pool.ts  generator.worker.ts
  LinksLobby.vue  LinksPlay.vue  LinksBoard.vue  LinksRules.vue  LinksSettings.vue
  logic/ types.ts grid.ts solver.ts generator.ts rules.ts
  logic/__tests__/ helpers.ts solver.test.ts generator.test.ts rules.test.ts
  __tests__/ LinksBoard.test.ts LinksLobby.test.ts LinksPlay.test.ts
```
