# Plan 04 – Shapes

A match-3 game: swap two neighbouring pieces to line up three or more of the same shape.
Pieces are original geometric SVG shapes with distinct colours **and** outlines, so they can
be told apart without colour vision.

## 1. Pieces

| Kind | Shape    | Colour (light theme) |
| ---- | -------- | -------------------- |
| 0    | Circle   | red                  |
| 1    | Triangle | orange               |
| 2    | Square   | yellow               |
| 3    | Diamond  | green                |
| 4    | Hexagon  | blue                 |
| 5    | Star     | purple               |

Early levels use 5 kinds, everything else 6.

### Special pieces

| Created by                         | Special  | Effect when matched / triggered            |
| ---------------------------------- | -------- | ------------------------------------------ |
| 4 in a line                        | Line     | clears its whole row (horizontal match) or column (vertical match) |
| L / T shape (two crossing lines)   | Burst    | clears the surrounding 3×3 area            |
| 5 in a line                        | Prism    | swapped with a piece: clears all pieces of that kind |

Combos: Line + Line → row and column; Burst + Line → three rows and three columns;
Burst + Burst → 5×5; Prism + special → every piece of that kind becomes that special and
triggers; Prism + Prism → clears the board. Specials hit by other specials trigger as well
(chain reactions).

## 2. Engine (`logic/`) – pure, deterministic

```ts
interface Piece { id: number; kind: number; special: 'none' | 'line-h' | 'line-v' | 'burst' | 'prism' }
type Board = (Piece | null)[]            // 8×8, index = row * 8 + col

createBoard(rng, kinds)                  // no initial matches, ≥ 1 valid move
findMatches(board)                       // runs ≥ 3, grouped into shapes (line / L / T)
isValidSwap(board, a, b)
resolveMove(board, a, b, rng) → ResolveResult
findAnyMove(board)                       // hint + dead-board detection
shuffle(board, rng)                      // keeps pieces, ensures no matches and ≥ 1 move
```

`resolveMove` returns a list of **phases** that the UI animates one after another:

```ts
type Phase =
  | { type: 'swap'; a: number; b: number }
  | { type: 'clear'; cells: number[]; created: { cell: number; piece: Piece }[]; triggered: number[]; score: number; cascade: number }
  | { type: 'fall'; moves: { from: number; to: number; id: number }[]; spawned: { cell: number; piece: Piece }[] }
  | { type: 'shuffle'; board: Board }
```

Cascades repeat clear → fall until the board is stable; then the engine guarantees a valid
move exists (otherwise a `shuffle` phase).

### Scoring

- 3 → 30, 4 → 60, 5+ → 100 points per match; cells cleared by specials 10 each.
- Multiplier = cascade depth (1×, 2×, 3× …).
- Creating a special: +50.

## 3. Modes

| Mode    | Rules                                                                                     | End                     | Stat          |
| ------- | ----------------------------------------------------------------------------------------- | ----------------------- | ------------- |
| Zen     | endless, no timer, board reshuffles automatically when stuck                              | never (manual "new")    | best score    |
| Time    | 90 s countdown; creating a special +2 s, cascade depth ≥ 3 +1 s                            | time runs out           | best score    |
| Levels  | generated levels with a move limit and goals                                              | goals met / moves gone  | highest level, stars |

### Level generation (`logic/levels.ts`)

`getLevel(n)` is deterministic (seed = `hashSeed('shapes-level', n)`) so a level number
always means the same level on every device:

- kinds: 5 for levels 1–5, then 6
- moves: 20–30, slowly decreasing
- goals (1–3, growing with n): reach score X; collect K pieces of kind(s) Y; create S specials
- stars: 1 = goals met; 2 / 3 = score ≥ 1.5× / 2× target (remaining moves give bonus
  points at the end)

Progress (`shapes:progress:v1`): highest unlocked level, stars per level. Level select grid
in the lobby.

## 4. UI & animation

- Board: square, `min(100vw − 32px, 520px)`; pieces are absolutely positioned elements moved
  with CSS `transform` transitions (GPU-friendly, 64 elements – no canvas required).
- Phases are animated sequentially with `await`: swap 150 ms, clear 200 ms (scale + fade),
  fall ~ 60 ms per row, spawn from above. Score pop-ups at the match centre.
- When motion is reduced, durations become 0 / instant fades.
- **Input**: swipe on a piece (pointer events, 20 px threshold) or tap-tap neighbours.
  Invalid swaps animate there and back. Input is locked while phases are animating.
- **Idle hint**: after 8 s without input a valid move gently pulses.
- HUD: score, mode-specific info (time bar / moves left + goal chips), pause menu.
- **Lobby** (`#/shapes`): mode cards (Zen / Time / Levels) with best score or level,
  "Continue" per mode with a saved run, level-select grid for Levels.

## 5. Persistence

`shapes:current:<mode>:v1` – board, score, RNG state, mode state (time left / moves left /
goal progress / level), next piece id. Saved after each resolved move and when the app is
hidden. Time mode pauses on hide and on the pause menu. Stats recorded when a run ends.

## 6. Files

```
games/shapes/
  index.ts  routes.ts  i18n.ts  settings.ts
  ShapesLobby.vue  ShapesPlay.vue  ShapesBoard.vue  ShapePiece.vue  ShapesHud.vue
  LevelSelect.vue
  logic/ types.ts board.ts match.ts specials.ts resolve.ts scoring.ts levels.ts modes.ts
  logic/__tests__/ …
```

### Settings (game section)

- Idle hint (on)

## 7. Tests

- `createBoard`: no matches, ≥ 1 move, deterministic per seed.
- `findMatches`: lines of 3/4/5, L and T shapes, overlapping runs.
- Specials creation and effects, including combos and chain reactions.
- `resolveMove`: invalid swap rejected; cascades terminate; final board has no matches and
  has a move; score/multiplier calculation.
- Levels: `getLevel(n)` deterministic, goals reachable in principle (sane parameters).

## 8. Acceptance criteria

- 60 fps animations on mid-range phones (transform/opacity only).
- No dead boards: the player always has a move.
- Reloading in the middle of a run restores it exactly (score, board, time/moves).
