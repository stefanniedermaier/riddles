# Shapes

Shapes is a match-3 game on an 8×8 board. Swap two neighbouring pieces so that three or
more pieces of the same shape line up in a row or column. They disappear, the pieces above
fall down and new pieces drop in from the top.

The pieces are original geometric shapes. Each kind has its own colour **and** outline,
so the game is playable without colour vision:

| Kind | Shape    | Colour |
| ---- | -------- | ------ |
| 0    | Circle   | red    |
| 1    | Triangle | orange |
| 2    | Square   | yellow |
| 3    | Diamond  | green  |
| 4    | Hexagon  | blue   |
| 5    | Star     | purple |

Levels 1–5 use five kinds (circle to hexagon), everything else uses all six.

## Controls

- **Swipe** a piece towards a neighbour (threshold: about a third of a cell), or
- **tap** a piece and then tap one of its four neighbours. Tapping it again deselects it.

A swap is only accepted if it creates a match (or involves specials, see below); otherwise
the pieces swap and slide back. Input is locked while a move is animating.

After 8 seconds without input a possible move pulses gently (can be switched off under
*Settings → Shapes → Hint when idle*).

## Special pieces

| Created by                       | Special | Marking         | Effect when cleared                                   |
| -------------------------------- | ------- | --------------- | ----------------------------------------------------- |
| 4 in a line (horizontal)         | Line    | ◄━► arrow bar   | clears its whole **row**                              |
| 4 in a line (vertical)           | Line    | vertical bar    | clears its whole **column**                           |
| L or T shape (crossing lines)    | Burst   | white ring      | clears the surrounding 3×3 area                        |
| 5 or more in a line              | Prism   | six-colour disc | see below – never part of a regular match              |

The special appears where the moved piece landed (or, for cascades, at the crossing point of
an L/T or the middle of the line). It keeps the kind of the match, so line and burst pieces
can be matched like normal pieces – which fires them.

**Chain reactions:** any special that is cleared – by a match or by another special's
effect – fires its own effect. A prism hit this way clears all pieces of the most common
kind on the board.

### Combos (swapping two specials)

Swapping two specials, or a prism with anything, is always a valid move:

| Swap              | Effect                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| Prism + piece     | clears every piece of that piece's kind                                 |
| Prism + Line/Burst| every piece of that kind becomes that special (lines get a random direction), then all fire |
| Prism + Prism     | clears the whole board                                                  |
| Line + Line       | clears the row and the column of the target cell                       |
| Burst + Line      | clears three rows and three columns around the target cell             |
| Burst + Burst     | clears the 5×5 area around the target cell                              |

## Scoring

| Event                                   | Points                       |
| --------------------------------------- | ---------------------------- |
| Match of 3                              | 30                           |
| Match of 4                              | 60                           |
| Match of 5 (+20 per further cell)       | 100                          |
| Cell cleared by a special (not matched) | 10                           |
| Creating a special                      | 50                           |

All points of a clear are multiplied by the **cascade depth**: ×1 for the direct result of
the move, ×2 for the first follow-up match caused by falling pieces, ×3 for the next, …

## Modes

| Mode   | Rules                                                                                         | End                      | Statistics                 |
| ------ | --------------------------------------------------------------------------------------------- | ------------------------ | -------------------------- |
| Zen    | Endless, no timer, no game over.                                                              | "New game" in the menu   | high score (counted when a run with points is ended) |
| Time   | 90 s countdown. Each special created gives +2 s, a cascade of depth ≥ 3 gives +1 s.            | time runs out            | high score                 |
| Levels | A move limit and 1–3 goals. Remaining moves become bonus points.                              | goals met / no moves left | levels won, best level score; stars per level |

The board is never dead: whenever no move is left after a turn, the pieces are shuffled
(keeping all specials) until there is no match and at least one move.

The countdown pauses while the pause menu is open and while the app is in the background.

### Level generation

`getLevel(n)` (`logic/levels.ts`) is fully deterministic: the seed is
`hashSeed('shapes-level', n)`, so level *n* has the same starting board, move limit and
goals on every device. Pieces that drop in later depend on the run's RNG.

- **Kinds:** 5 for levels 1–5, then 6.
- **Moves:** 30, decreasing by one every three levels down to 18.
- **Difficulty ramp:** `ramp = min(0.9, 0.5 + 0.012·n) ± 0.03`.
- **Score goal** (always): `moves × pointsPerMove × ramp`, rounded to 100.
- **Collect goal** (from level 2): clear `moves × clearedPerKindPerMove × ramp × 0.85`
  pieces of one kind.
- **Third goal:** every third level from level 4 *create N specials* (1–3); from level 8
  sometimes a second collect goal (×0.7).
- **Stars:** 1 = goals met, 2 = final score ≥ 1.5× score goal, 3 = ≥ 2×.
  Final score = score + unused moves × `moveBonus` (≈ 1.2 × score goal / moves).

`pointsPerMove` (220 with 5 kinds, 145 with 6) and `clearedPerKindPerMove` (1.8 / 1.2) were
measured with a bot that plays half of its moves greedily (best immediate score, without
knowing future drops) and half at random. With these values that bot wins early levels
almost always and later levels roughly half of the time; a purely greedy bot does clearly
better and earns more stars.

## Engine

All game logic lives in `src/games/shapes/logic/` as pure, deterministic TypeScript
(seeded with `core/rng.ts`):

| File          | Content                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `types.ts`    | board, piece, special and mode types, helpers                           |
| `match.ts`    | run detection, grouping into lines / L / T shapes                       |
| `board.ts`    | board creation (no initial matches, ≥ 1 move), move search, shuffle     |
| `specials.ts` | special effects and combos                                               |
| `resolve.ts`  | `resolveMove` – produces animation **phases** and the final board        |
| `scoring.ts`  | point values                                                            |
| `levels.ts`   | level definitions, goals, stars                                         |
| `modes.ts`    | runs (persisted state), applying moves per mode, validation of saves     |

`resolveMove(board, a, b, ctx)` returns a list of phases – `swap`, `clear` (cells, created
specials, triggered specials, score, cascade depth), `fall` (moves and spawned pieces) and
optionally `shuffle` – each with a board snapshot. `animator.ts` plays them one after another
with CSS transform transitions. Piece ids are used as Vue keys and the rendered list is
sorted by id, so DOM elements are never re-ordered and transitions are not interrupted.
With reduced motion the final board is shown immediately.

## Storage keys

| Key (prefix `riddles:`)       | Content                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| `shapes:current:zen:v1`       | running Zen game                                                |
| `shapes:current:time:v1`      | running Time game incl. time limit and elapsed time            |
| `shapes:current:levels:v1`    | running level incl. moves left and goal progress                |
| `shapes:progress:v1`          | `{ unlocked, stars: { [level]: 1–3 } }`                         |
| `shapes:settings`             | `{ idleHint }`                                                  |
| `stats:v1` → `shapes`         | started / finished / best score per mode (shared statistics)    |

A saved run contains the board, score, RNG state, next piece id, number of kinds and the
mode-specific state, so a reload continues exactly where the player left off. Runs are
saved after every move, when the app goes to the background and when leaving the screen.
