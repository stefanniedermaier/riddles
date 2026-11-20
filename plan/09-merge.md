# Plan 09 – Merge

A sliding number game (genre popularised by *2048*; name, colours and artwork are original).
Swipe to slide all tiles in one direction; two tiles with the same number that collide merge
into one tile with their sum. After every move a new tile (2, rarely 4) appears. Reach the
target tile – then keep going for a higher score until no move is possible.

## 1. Variants

| Variant  | Board | Target tile | Notes                       |
| -------- | ----- | ----------- | --------------------------- |
| Small    | 3×3   | 256         | hard, short runs            |
| Classic  | 4×4   | 2048        | the standard                |
| Large    | 5×5   | 4096        | relaxed, long runs          |

Statistics variants: `small`, `classic`, `large` (score-based: best score; plus the highest
tile reached per variant, shown in the lobby and the result dialog).

## 2. Engine (`logic/`, pure and deterministic)

```ts
interface Tile { id: number; value: number; cell: number }
interface MergeRun {           // storage key merge:current:<variant>:v1
  variant: Variant
  size: number
  tiles: Tile[]
  score: number
  moves: number
  rngState: number             // core/rng state → reload continues identically
  nextId: number
  won: boolean                 // target reached (dialog shown once)
  keepPlaying: boolean
  over: boolean
}

newRun(variant, seed)          // two starting tiles
slide(run, direction) → { run, moved, merges: {from: [id, id], into: Tile}[], spawned: Tile | null, gained }
canMove(run)                   // empty cell or equal neighbours
```

Rules (standard for the genre): tiles slide as far as possible; each tile merges at most once
per move; merging order starts from the side the tiles move towards (e.g. `2 2 2 2 → 4 4`,
`2 2 2 → 4 2`, `4 4 8 → 8 8`); the score increases by the value of every merged tile; a move
that changes nothing does not spawn a tile and does not count. New tile: 2 with 90 %, 4 with
10 % probability on a random empty cell (seeded RNG).

## 3. UI

- **Lobby** (`#/merge`): variant list (Small / Classic / Large) with best score and highest
  tile; *Continue* per variant when a run is saved (saved only after the first move).
  Short how-to at the top for first-time players, below the list afterwards.
- **Play** (`#/merge/play/:variant`): score, best score, board.
  - Tiles are absolutely positioned and moved with CSS transforms (keys = tile ids):
    slide ~120 ms, merge "pop", new tile fade/scale-in; reduced motion → instant.
  - Original colour scale per value (light and dark theme), numbers auto-sized so 4- and
    5-digit tiles fit; values ≥ 8192 share a dark "high" style.
- **Input:** swipe on the board (pointer events, threshold ~24 px, dominant axis,
  `touch-action: none`), arrow keys and WASD on desktop. Input is queued/ignored while an
  animation runs (latest direction wins, max one queued).
- **Target reached:** dialog "You made 2048!" with *Keep playing* · *New game*.
- **Game over:** result dialog (score, best, highest tile, moves, new best) with
  New game · Merge menu · Home; statistics recorded.
- Pause menu: New game (confirm), Back to menu. No undo (by decision).

## 4. Persistence & stats

`merge:current:<variant>:v1` saved after every move and when leaving/hiding (only once the
run has at least one move); `merge:records:v1` = highest tile per variant;
`recordStart` when a run starts with its first move, `recordFinish({ score })` on game over
or when a started run is replaced by *New game*.

## 5. Tests

Slide/merge rules in all four directions incl. the classic edge cases above, score,
no-op moves, spawn probabilities and determinism (same seed ⇒ same game), canMove/game
over, target detection, save/resume round trip, a component test that plays moves via
keyboard and reaches game over / target with a prepared board.

## 6. Acceptance criteria

- Fits 360×640 without scrolling; 5×5 tiles ≥ 56 px.
- 60 fps animations (transform/opacity only), no dropped inputs during fast swiping.
