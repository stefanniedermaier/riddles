# Plan 06 – Links

A path-connection puzzle (genre: *Numberlink*). Pairs of coloured dots are placed on an
N×N grid. Draw one line per colour connecting its two dots so that lines never cross or
branch and **every cell of the grid is filled**. Name, artwork and levels are original.

## 1. Difficulty → size

| Difficulty | Size    | Colours (approx.) |
| ---------- | ------- | ----------------- |
| Easy       | 5×5     | 4–5               |
| Medium     | 7×7     | 6–7               |
| Hard       | 9×9     | 8–10              |
| Expert     | 11×11   | 10–13             |

Every puzzle has exactly one solution (full coverage) and is generated on the device.

## 2. Data model (`logic/types.ts`)

```ts
interface LinksPuzzle {
  seed: number
  difficulty: Difficulty
  size: number
  endpoints: { color: number; a: number; b: number }[]   // cell index = row * size + col
  solution: number[][]                                    // cell path per colour, a → b
}

interface LinksSave {                // storage key: links:current:v1
  puzzle: LinksPuzzle
  paths: number[][]                  // player path per colour (starting at an endpoint)
  elapsedMs: number
  hintsUsed: number
  moves: number                      // a "move" = a drag that changed a different colour than the previous one
  undo: …                            // compact undo steps (changed colours' previous paths)
}
```

## 3. Algorithms

### 3.1 Generator (`logic/generator.ts`)

1. **Cover the grid with paths:** start from a random Hamiltonian-like covering (e.g. a
   serpentine path randomised by *backbite* moves, or random path growth with merging) and
   cut it into segments of length ≥ 3; then perturb (split/merge/extend neighbouring paths)
   to get the target colour count and varied shapes.
2. **Endpoints** are the segment ends. Reject layouts where two endpoints of the same colour
   are adjacent (trivial) or where a path has needless "zig-zags" that make the solution
   ambiguous.
3. **Uniqueness:** an exact solver (§3.2) must find exactly one solution; otherwise repair
   (merge the paths involved in the alternative, or regenerate). Deterministic per seed,
   attempt-count budget with best-so-far fallback.

### 3.2 Exact solver (`logic/solver.ts`)

Backtracking that extends paths from their heads, choosing the most constrained head first,
with pruning: forced moves (a head with one free neighbour), dead cells (a free cell with < 2
free/endpoint neighbours that cannot become a path end), stranded regions (a free region not
reachable by any unfinished colour), and colours whose heads got separated. `countSolutions(…,
limit = 2)` for uniqueness.

### 3.3 Rules / validation (`logic/rules.ts`)

Player paths may be partial; a puzzle is solved when every colour connects its two endpoints
and every cell is covered. Drawing over another colour's path cuts that path at the crossing
point (as is usual for the genre).

## 4. UI

- **Lobby** (`#/links`): continue, difficulty list with size and best time; rules at the top
  for first-time players, below the list afterwards.
- **Board:** square grid; endpoints as large coloured dots; paths as thick rounded lines with
  a light tint of the colour in filled cells. 13-colour palette that works in light and dark
  theme and is distinguishable (dots also carry a small number/letter for colour-blind
  players – optional setting).
- **Input:** drag from an endpoint or from the end of an existing path to draw; dragging
  back over the own path shortens it; drawing into another colour cuts it; touching an
  endpoint of the same colour completes the path. Pointer capture + hit testing as in
  Crowns. A completed connection pulses briefly.
- **HUD:** connections `x / n`, filled `y %`, moves, timer.
- **Toolbar:** Undo (Ctrl/Cmd+Z), Hint (reveals the full solution path of one colour that is
  not correct yet; counts as a hint), Restart (confirm).
- **Win:** all connected and 100 % filled → result dialog (time, moves, *perfect* if
  moves = colour count, hints, new best) with New game · Links menu · Home.

### Settings

- Show colour labels on dots (off)

## 5. Statistics & storage

`recordStart` / `recordFinish({ timeMs })` per difficulty. Keys: `links:current:v1`,
`links:pool:v1`, `links:settings`.

## 6. Tests

Generator for every difficulty and several seeds: size, colour count range, endpoints valid,
solution paths valid and covering, exactly one solution, deterministic per seed. Solver on
hand-made puzzles (unique / multiple / none). Rules: cutting, shortening, completion,
coverage. Undo and moves counting. Hints apply a correct path.

## 7. Acceptance criteria

- 11×11 Expert generated within the worker budget; the prefetch pool makes new games instant.
- Comfortable drawing at 360 px width for 11×11 (~30 px cells), no scrolling during play.
