# Pipes

A rotation puzzle (plan: [plan/14-pipes.md](../../plan/14-pipes.md), genre *Netwalk*). Every
tile holds a piece of pipe; turn the tiles until all pipes form one network fed by the source,
with no open ends. Name, artwork and puzzles are original; every puzzle is generated on the device.

## Rules

- Tiles have 1–4 pipe ends: end piece, straight, bend, T-piece, cross. One tile is the **source**.
- **Tap** turns a tile 90° clockwise. Water fills every pipe connected to the source.
- **Long press** (≈ 350 ms) or right click **locks** a tile; locked tiles do not turn.
- Solved when every tile has water and no pipe end is open (every end meets an end of the
  neighbour, none points off the board). Any such arrangement counts.
- **Expert** has three numbered sources, each with its own colour (blue, orange, purple). Every
  tile needs water from exactly one source; if two networks connect, the water mixes (red, no
  core line) and the puzzle is not solved. The core line of filled pipes differs per source
  (solid, dashed, dotted), so colour is not the only cue ([plan 18](../../plan/18-pipes-colors.md)).

## Controls

| Action          | Effect                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| Tap             | turn clockwise (locked tiles: a toast says the tile is locked)          |
| Long press / right click | lock or unlock                                                 |
| Keyboard        | arrow keys move the cursor, Enter / Space turns, L locks                |
| Undo (↶ / Ctrl+Z) | turns the last turned tile back (and unlocks it)                      |
| Hint            | a wrongly locked tile is unlocked; otherwise one tile (next to the water if possible) is turned into its solution position and locked |
| Restart         | the same puzzle from the start (confirmation)                           |

## Difficulties

| Difficulty | Board  | Generator                                       |
| ---------- | ------ | ----------------------------------------------- |
| Easy       | 5×5    | long corridors (75 %), no crosses                |
| Medium     | 7×7    | corridors 60 %                                   |
| Hard       | 8×10   | corridors 45 %                                   |
| Expert     | 7×8    | three sources, corridors 45 %                    |

The first Expert level (10×12, one source) was removed after testing on phones: the tiles were
too small to turn reliably. Expert now gets harder through several sources instead of a larger
board (same variant id, so its statistics continue). Saves are only accepted when the board size
matches the difficulty, so an old 10×12 save is discarded.

## Generator (`logic/generator.ts`)

A random spanning tree over the grid grown from the source (centre). With the *corridor*
chance the newest cell is extended, otherwise the tree branches at a random cell. With several
sources a **forest** grows: each step extends the smallest tree that can still grow, so the
networks stay about equal in size. Sources are spread out (inner cells, pairwise distance ≥ 4). Every tile
then gets a random rotation; at least half of the tiles must look different from the solution
and the start must not be solved. Deterministic per seed, takes well under a millisecond – no
worker or pool.

## Storage

| Key                | Content                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `pipes:current:v1` | puzzle, turns per tile, locked tiles, moves, time, hints, undo – saved after the first action |

Statistics per difficulty (time); a puzzle counts as started with the first action.
