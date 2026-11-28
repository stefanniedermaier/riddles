# Shapes

Shapes is a match-3 game on an 8×8 board. Swap two neighbouring pieces so that three or
more pieces of the same kind line up in a row or column. They disappear, the pieces above
fall down and new pieces drop in from the top.

The pieces are original fruit-and-garden illustrations (inline SVG, `ShapePiece.vue`). Each
kind has its own saturated colour **and** silhouette, so the game is playable without colour
vision:

| Kind | Piece      | Colour |
| ---- | ---------- | ------ |
| 0    | Strawberry | red    |
| 1    | Orange     | orange |
| 2    | Lemon      | yellow |
| 3    | Leaf       | green  |
| 4    | Flower     | blue   |
| 5    | Grapes     | purple |

Levels 1–5 use five kinds (strawberry to flower), everything else uses all six.

## Controls

- **Swipe** a piece towards a neighbour (threshold: about a third of a cell), or
- **tap** a piece and then tap one of its four neighbours. Tapping it again deselects it.

A swap is only accepted if it creates a match (or involves specials, see below); otherwise
the pieces swap and slide back. In levels, a drop item may additionally always be swapped
one row **down** (see *Obstacles*). Input is locked while a move is animating.

After 8 seconds without input a possible move pulses gently (can be switched off under
*Settings → Shapes → Hint when idle*).

## Special pieces

| Created by                       | Special | Marking         | Effect when cleared                                   |
| -------------------------------- | ------- | --------------- | ----------------------------------------------------- |
| 4 in a line (horizontal)         | Line    | rocket (→)      | clears its whole **row**                              |
| 4 in a line (vertical)           | Line    | rocket (↑)      | clears its whole **column**                           |
| L or T shape (crossing lines)    | Burst   | dynamite        | clears the surrounding 3×3 area                        |
| 5 or more in a line              | Prism   | rainbow ball    | see below – never part of a regular match              |

The special appears where the moved piece landed (or, for cascades, at the crossing point of
an L/T or the middle of the line). It keeps the kind of the match, so line and burst pieces
can be matched like normal pieces – which fires them.

Rockets and dynamite are drawn in the colour and texture of their kind (seeds, pores, the
lemon tip, veins, petals, berries) in their own shape, so the kind to match stays visible;
the rocket points the way it clears.

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
| Zen    | Endless, no timer, no game over.                                                              | "End game" or "New game" in the pause menu | high score (counted when a run with points is ended) |
| Time   | 90 s countdown. Each special created gives +2 s, a cascade of depth ≥ 3 gives +1 s.            | time runs out            | high score                 |
| Levels | Played in order, one level after the other. A move limit and 1–3 goals; remaining moves become bonus points. | goals met / no moves left | levels won, best level score |

The board is never dead: whenever no move is left after a turn, the pieces are shuffled
(keeping all specials) until there is no match and at least one move.

The countdown pauses while the pause menu is open and while the app is in the background.

### Level progression

There is no level select and there are no stars: the *Levels* entry in the lobby always
shows and starts the **current level**. Winning it unlocks the next one (*Next level*);
losing offers *Try again* for the same level. Finished levels cannot be replayed, and
levels never run out – they keep being generated. Every result dialog also has a *Home*
button.

### Obstacles

All obstacles have their own artwork, are drawn on the board and appear as goal cards
above it (icon, `current/target`, progress bar, check mark when done).

| Obstacle        | Look                              | Rules                                                                                     | Goal |
| --------------- | --------------------------------- | ----------------------------------------------------------------------------------------- | ---- |
| **Target tile** | garden-bed tile (soil with grass tufts) under a piece | Cleared when the piece on it is cleared (match or special).                              | clear all tiles |
| **Chain**       | crossed steel chains with a padlock over a piece | The piece cannot be swapped and does not fall. Part of a match or hit by a special → the chain breaks, the piece stays. | free all chained pieces |
| **Crate**       | wooden crate (reinforced = metal corners, 2 hits) | Occupies the cell (no piece). Pieces stop above it. Each match next to it (orthogonally) and each special hitting it removes one hit point (max. one per clear). | break all crates |
| **Drop item**   | round token with a down arrow      | Cannot be matched and is immune to specials. Falls like a piece; collected when it reaches the bottom row. Like any piece it can only be swapped when the swap creates a match. | bring N items down |

**Gravity with obstacles:** each column is split into segments by crates and chained pieces.
Pieces fall to the bottom of their segment; the top segment is refilled from above the
board (drop items enter only there, preferably in the middle columns), lower segments get
new pieces that appear in place. When a crate breaks or a chain is released, the segments
merge again. Fixed obstacles are never placed in the bottom row, so items can always be
collected. A dead board is shuffled without moving crates, chained pieces or items.

**Swapping a prism with a drop item** clears the most common kind (items have no kind).

### Level generation

`getLevel(n)` (`logic/levels.ts`) is fully deterministic: the seed is
`hashSeed('shapes-level', n)`, so level *n* has the same starting board, obstacles, move
limit and goals on every device. Pieces that drop in later depend on the run's RNG.

- **Kinds:** 5 for levels 1–5, then 6.
- **Obstacle types are introduced one by one**, each on its own level: target tiles at
  level 3, chains at 5, crates at 7, drop items at 9. Afterwards every level (from 3 on) is
  with 80 % an obstacle level using one unlocked type, from level 12 sometimes two
  (with 55 % of the amounts each), otherwise a *classic* level.
- **Layouts** are mirrored left/right; amounts grow over 30 levels after an obstacle's
  introduction: targets 8–16, chains 4–10, crates 4–14 (from level 12, 40 % of them
  reinforced), drop items 2–4 (up to two start in row 2 of the middle columns).
- **Moves of obstacle levels:** `need = Σ base + weighted units × movesPerUnit`
  (units in the edge columns count 1.4×; ×0.9 for two types), then
  `moves = need × slack`, slack from 1.5 (level 3) to 1.2 (level ≥ 43), ×1.3 on
  introduction levels, clamped to 12–40.

  | Type   | base | moves per unit |
  | ------ | ---- | -------------- |
  | target | 3    | 1.9            |
  | chain  | 5    | 3.1            |
  | crate  | 6    | 0.9 per hit    |
  | item   | 2    | 4.8            |
- **Classic levels:** move limit 30, decreasing by one every three levels down to 18;
  difficulty ramp `min(0.9, 0.5 + 0.012·n) ± 0.03`; score goal
  `moves × pointsPerMove × ramp`; a collect goal from level 2; every third level from
  level 4 *create N specials*, from level 8 sometimes a second collect goal.
  Final score = score + unused moves × `moveBonus`.

**Tuning.** The constants were measured with a bot (`logic/__tests__/bot.ts`) that plays
half of its moves greedily (best goal progress, then score) and half at random. Bot win
rates (24 games per level): levels 1–10 ≈ 94 %, 11–25 ≈ 85 %, 26–50 ≈ 79 %, 51–100 ≈ 73 %;
introduction levels 75–100 %. Reproduce with

```bash
SHAPES_TUNING=1 SHAPES_FROM=1 SHAPES_TO=100 SHAPES_OUT=tuning.txt \
  npx vitest run src/games/shapes/logic/__tests__/levels.tuning.test.ts
```

(`SHAPES_NEED=1` instead measures the moves needed per obstacle unit without move limit.)

## Engine

All game logic lives in `src/games/shapes/logic/` as pure, deterministic TypeScript
(seeded with `core/rng.ts`):

| File          | Content                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `types.ts`    | board, piece, special, obstacle field and mode types, helpers            |
| `match.ts`    | run detection, grouping into lines / L / T shapes                       |
| `board.ts`    | board creation (no initial matches, ≥ 1 move), move search, shuffle     |
| `specials.ts` | special effects and combos                                               |
| `resolve.ts`  | `resolveMove` – produces animation **phases** and the final board        |
| `scoring.ts`  | point values                                                            |
| `levels.ts`   | level definitions, obstacle layouts, goals, move limits                 |
| `modes.ts`    | runs (persisted state), applying moves per mode, validation of saves     |

`resolveMove(board, a, b, ctx, field?)` returns a list of phases – `swap`, `clear` (cells,
created specials, triggered specials, score, cascade depth, obstacles afterwards), `fall`
(moves and spawned pieces), `collect` (drop items leaving at the bottom) and optionally
`shuffle` – each with a board snapshot, plus the updated obstacle field. Without a field
(Zen, Time) the engine behaves exactly as before obstacles existed. `animator.ts` plays them one after another
with CSS transform transitions. Piece ids are used as Vue keys and the rendered list is
sorted by id, so DOM elements are never re-ordered and transitions are not interrupted.
Clears additionally show short board effects (juice splashes in the colour of the kind, a
beam for rockets, a shockwave for dynamite, a rainbow ring for the prism), and the points of
every clear fly from the cleared cells to the score, which bumps when they land.
With reduced motion the final board is shown immediately, without effects or flying points.

## Storage keys

| Key (prefix `riddles:`)       | Content                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| `shapes:current:zen:v1`       | running Zen game                                                |
| `shapes:current:time:v1`      | running Time game incl. time limit and elapsed time            |
| `shapes:current:levels:v2`    | running level incl. moves left, goal progress and obstacle field |
| `shapes:progress:v2`          | `{ level }` – the level to play next                            |
| `shapes:settings`             | `{ idleHint }`                                                  |
| `stats:v1` → `shapes`         | started / finished / best score per mode (shared statistics)    |

A saved run contains the board, score, RNG state, next piece id, number of kinds and the
mode-specific state, so a reload continues exactly where the player left off. Runs are
saved after every move, when the app goes to the background and when leaving the screen.
A run is only saved once it has at least one valid move, so merely opening a mode leaves no
*Continue* behind (and replaces an older save of that mode). *End game* (Zen) records the
score, removes the save and shows the result. The home screen shows *Continue* on the Shapes
card only for Time and Levels runs – Zen is endless, so a saved Zen run is only offered in
the Shapes menu.

**Migration:** the highest unlocked level of the old `shapes:progress:v1` becomes the
current level; old `v1` progress and level runs (without obstacles) are removed.

## Lobby

The lobby lists Zen, Time and *Level N*. New players see the instructions (controls and
obstacles) at the top; once a Shapes game has been started (statistics, a saved run or a
level beyond 1) the instructions move to the bottom of the page.
