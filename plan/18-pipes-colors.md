# Plan 18 – Pipes: several sources (Expert)

The old Expert level (10×12) was too fiddly on phones and was removed. A new top level makes
Pipes harder **without smaller tiles**: several sources, each feeding its own network.

## 1. Rules

- **Expert**: board 7×8, **three sources**. Every source has its own colour and number
  (1, 2, 3).
- Water fills every pipe connected to a source, in that source's colour.
- Solved when every tile has water from **exactly one** source and no pipe end is open. If
  two networks touch (a pipe connects them), their water mixes – shown as mixed (red, dotted)
  and the puzzle is not solved.
- Easy, Medium and Hard keep one source and look exactly as before.

## 2. Data model

`PipesPuzzle` gets an optional `sources?: number[]` (all sources, first = `source`). Absent
means one source, so saves of older versions stay valid. Saves are only accepted when the
board size matches the difficulty (an old 10×12 Expert save is dropped).

## 3. Generator

A random spanning **forest**: the trees grow from all sources at once; each step extends the
smallest tree that can still grow (balanced networks), with the same corridor/branch bias per
tree as before. Sources are spread out (random cells, pairwise distance ≥ 4, not on the
border). Edges only join cells of the same tree, so the generated solution has no mixing.
Expert: corridor 0.45, crosses allowed.

## 4. Rules code

- `colors(puzzle, turns)`: per cell the source index that reaches it, `-1` dry, `-2` mixed
  (reached from two sources). `flow` = cells with exactly one source.
- `isSolved`: no open end and every cell has exactly one source.
- Hints unchanged (turn a tile into its solution orientation).

## 5. UI and accessibility

- Source colours: 1 = game colour (blue), 2 = orange, 3 = purple, light and dark theme,
  ≥ 3:1 against tiles and locked tiles (WCAG 1.4.11). Mixed water in the danger colour.
- Not by colour alone (WCAG 1.4.1): the light core line of filled pipes differs per source
  (solid, dashed, dotted); sources show their number; mixed pipes have no core line.
- Screen reader: "source 2", "water from source 2", "mixed water".
- Lobby: "Expert · 7×8 · 3 sources". Rules text explains several sources.
- Statistics: variant id stays `expert`.

## 6. Tests

Generator (forest: edges = cells − sources, all cells covered, sources spread, solution
solved), `colors` (mixed detection), `isSolved` false when networks connect, save migration
(without `sources`, wrong size rejected), board renders numbers and per-source classes.
