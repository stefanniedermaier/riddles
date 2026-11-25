# Plan 14 – Pipes

A rotation puzzle (genre *Netwalk* / *pipe rotation*): every tile holds a piece of pipe.
Rotate the tiles until all pipes form one connected network without open ends, fed by the
source in the middle. Name, artwork and puzzles are original and generated.

## 1. Rules

- Each tile has 1–4 pipe ends pointing up, right, down or left: end piece (1), straight (2),
  bend (2), T-piece (3), cross (4). One tile is the **source**.
- **Tap** rotates a tile 90° clockwise. Long press (or right click) **locks** a tile – locked
  tiles do not rotate, which helps to keep track of solved parts. Tapping a locked tile shakes it.
- Water flows from the source through every pair of matching ends; connected pipes are shown
  filled.
- The puzzle is solved when every tile is connected to the source and no pipe end is open
  (every end meets an end of the neighbour; none points at the board edge). Any such
  arrangement counts – it does not have to be the generated one.

## 2. Difficulty → size

Phone first: at most 10 columns.

| Difficulty | Board (cols × rows) | Notes                                       |
| ---------- | ------------------- | ------------------------------------------- |
| Easy       | 5×5                 | few T-pieces, no crosses                    |
| Medium     | 7×7                 |                                             |
| Hard       | 8×10                |                                             |
| Expert     | 10×12               | more T-pieces – *removed after device tests (too fiddly); replaced by plan 18* |

## 3. Data model

```ts
interface PipesPuzzle {
  seed: number
  difficulty: Difficulty
  width: number
  height: number
  source: number
  /** Solution: pipe ends per cell as bit mask (1 up, 2 right, 4 down, 8 left). */
  solution: number[]
  /** Clockwise quarter turns applied to each solution tile for the start position. */
  scramble: number[]
}

interface PipesSave {                  // pipes:current:v1
  puzzle: PipesPuzzle
  turns: number[]                      // current quarter turns per cell (0–3), relative to the solution
  locked: number[]
  moves: number
  elapsedMs: number
  hintsUsed: number
  undo: number[]                       // cells turned clockwise, newest last
}
```

## 4. Algorithms (`logic/`)

- **Generator**: random spanning tree over the grid, grown from the source (randomised
  Prim's). A bias decides how often a new branch starts at an older cell (more T-pieces,
  harder) instead of extending the newest path (long corridors, easier). Crosses only from
  Medium on. Every cell gets a random rotation; tiles whose rotation does not change their
  look (straight turned by 180°, cross) count as solved. Re-roll if the start is already
  solved or fewer than half of the tiles are off. Deterministic per seed; generation is
  cheap (main thread, no worker or pool needed).
- **Rules**: `rotate(mask, turns)`, `flow(source)` = BFS through matching ends,
  `isSolved` = all cells reached and no open end.
- **Hint**: a tile that is not locked and not in its solution orientation (preferring tiles
  next to the water) is turned into the solution orientation and locked. If all tiles are in a
  solution orientation but locked wrong, the hint unlocks it. Counts as a hint.

## 5. UI

- Lobby (`#/pipes`): continue, difficulty list (size, best time), rules (first for new players).
- Board: square cells, pipes as thick rounded SVG strokes, empty pipes grey, filled pipes in
  the game colour; the source as a round tank. Rotation animates (≈ 150 ms, off with reduced
  motion). Locked tiles get a darker background and a small corner mark.
- HUD: difficulty, moves, connected tiles in %. Toolbar: Undo, Hint, Restart (confirm).
- Keyboard: arrow keys move a cursor, Enter/Space rotates, L locks.
- Win → result dialog (time, moves, hints, new best) with New game · Pipes menu · Home.

## 6. Statistics & storage

Variants = difficulties, `statKind: 'time'`. `recordStart` on the first move,
`recordFinish({ timeMs })` on a win. Keys `pipes:current:v1` (after the first move).

## 7. Tests

Generator: every cell connected, tree (n − 1 edges), no ends at the border, deterministic,
not solved at the start. Rules: rotation of masks, flow, solved detection incl. an alternative
solution. Hint makes progress and a puzzle solved only by hints ends in a win. Component tests:
tap rotates, lock blocks rotation, undo, save after the first move, solve via hints.
