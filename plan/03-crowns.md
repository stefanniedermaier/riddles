# Plan 03 – Crowns

A logic puzzle on an N×N grid divided into N coloured regions. Place N crowns so that every
row, every column and every region contains exactly one crown and no two crowns touch –
not even diagonally. (The genre is also known as "Star Battle" with one star.)

## 1. Difficulty → size

| Difficulty | Size        | Logic required (see §3.3)     |
| ---------- | ----------- | ----------------------------- |
| Easy       | 6×6         | levels 1–2                    |
| Medium     | 7×7 or 8×8  | up to level 3                 |
| Hard       | 9×9         | level 3 required, up to 4     |
| Expert     | 10×10       | level 4 required              |

Every puzzle has exactly one solution and is solvable without guessing.

## 2. Data model (`logic/types.ts`)

```ts
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type CellState = 0 | 1 | 2               // empty | marked (✕) | crown

interface CrownsPuzzle {
  seed: number
  difficulty: Difficulty
  size: number
  regions: number[]                      // length size², region index per cell
  solution: number[]                     // solution[row] = column of the crown
  hardestLevel: number
}

interface CrownsSave {                   // storage key: crowns:current:v1
  puzzle: CrownsPuzzle
  cells: CellState[]
  elapsedMs: number
  hintsUsed: number
}
```

## 3. Algorithms

### 3.1 Exact solver (`logic/solver.ts`)

Row-by-row backtracking with bitmasks for used columns and regions plus the "no touching"
check against the previous row. `countSolutions(puzzle, limit = 2)`; also returns the first
alternative solution, which the generator uses for repair.

### 3.2 Generator (`logic/generator.ts`)

1. **Crowns:** random permutation `col[row]` with `|col[r] − col[r+1]| ≥ 2` (randomised
   backtracking).
2. **Regions:** each crown cell seeds one region. Grow regions by repeatedly picking a
   region (random, weighted towards smaller regions, with occasional bias for "snakes") and
   assigning one random unassigned 4-neighbour, until the grid is covered. Regions are
   always contiguous.
3. **Uniqueness repair:** while `countSolutions > 1`: take the alternative solution, pick a
   crown cell of it that is not a crown in the intended solution, and move that cell into an
   adjacent different region – only if both regions stay contiguous and the cell is not the
   seed. This invalidates the alternative. After too many iterations, restart from step 2.
4. **Grade** with the logical solver (§3.3); accept if the level window of the difficulty
   matches, otherwise retry (new derived seed). Time budget ~4 s with best-so-far fallback.
5. Region indices are renumbered in reading order so colours are distributed nicely.

Runs in `generator.worker.ts` with a prefetch pool (same helpers as Sudoku).

### 3.3 Logical solver (`logic/logic.ts`)

Works on a candidate set (cells that may still hold a crown). Placing a crown eliminates its
row, column, region and the 8 neighbours.

| Level | Technique                | Description                                                                    |
| ----- | ------------------------ | ------------------------------------------------------------------------------ |
| 1     | Last cell                | a row, column or region has exactly one candidate left → crown                  |
| 2     | Confinement              | all candidates of a region lie in one row/column → eliminate the rest of that line; all candidates of a line lie in one region → eliminate the rest of that region |
| 3     | Forced elimination       | crowning a candidate would eliminate all candidates of some row/column/region → it can't hold a crown |
| 4     | Group confinement        | k regions whose candidates lie within k rows (or columns) → eliminate other cells in those lines; and the line→region counterpart (k ≥ 2) |

Each step returns the technique, the affected unit(s), focus cells and the
eliminations/placements, so it can be used for both grading and hints.

### 3.4 Hints

1. A crown that is not part of the solution, or an ✕ on a solution cell → "This cell is
   wrong".
2. Otherwise compute candidates from the board (player crowns placed, player ✕ treated as
   eliminations – they are verified correct by step 1) and return the next logical step with
   an explanation and highlighted cells, plus a "Apply" button.

## 4. UI

- **Lobby** (`#/crowns`): "Continue", difficulty list showing grid size and best time.
- **Board**: square grid; each region filled with a pastel colour from an 11-colour palette
  tuned for light and dark theme. Thick borders between different regions make regions
  readable without relying on colour alone.
- **Input**:
  - Tap cycles empty → ✕ → crown → empty.
  - Drag across cells paints ✕ (if the first cell was empty) or erases ✕ (if it was ✕);
    crowns are never changed by dragging.
- **Auto-✕** (setting, default on): cells excluded by placed crowns are shown with a subtle
  dot – computed, not stored, so removing a crown restores them.
- **Conflicts**: crowns that break a rule (same row/column/region or touching) are shown in
  the error colour.
- **Win**: N crowns without conflict → result dialog (time, size, hints, new best?).
- Toolbar: Hint, Clear board; timer in the app bar.
- Crown icon: own simple SVG glyph.

### Settings (game section)

- Auto-✕ around crowns (on)
- Show conflicts (on)

## 5. Files

```
games/crowns/
  index.ts  routes.ts  i18n.ts  settings.ts
  CrownsLobby.vue  CrownsPlay.vue  CrownsBoard.vue  CrownsSettings.vue
  generator.worker.ts  palette.ts
  logic/ types.ts solver.ts generator.ts logic.ts hints.ts rules.ts
  logic/__tests__/ …
```

## 6. Tests

- Solver: counts solutions correctly on hand-crafted grids.
- Generator, for each difficulty and several seeds: correct size, N contiguous regions,
  each region contains exactly one solution crown, solution satisfies all rules, exactly one
  solution, logically solvable, level inside the difficulty window, deterministic per seed.
- Rules: conflict detection for rows, columns, regions and touching.
- Hints: wrong crown detected; otherwise the step is consistent with the solution.

## 7. Acceptance criteria

- 10×10 Expert puzzles are generated within the worker's time budget; with the prefetch
  pool the user normally never waits.
- Board is comfortably playable on a 360 px wide screen at 10×10 (≈ 34 px cells).
