# Merge

A sliding number game (the genre popularised by *2048*; name, colours and artwork are
original). Slide all tiles in one direction; two equal tiles that collide merge into one
tile with their sum. After every move a new tile appears. Reach the target tile – then keep
going for a higher score until no move is left.

## Variants

| Variant | Board | Target | Statistics variant |
| ------- | ----- | ------ | ------------------ |
| Small   | 3×3   | 256    | `small`            |
| Classic | 4×4   | 2048   | `classic`          |
| Large   | 5×5   | 4096   | `large`            |

## Controls

| Input              | Effect                                                         |
| ------------------ | -------------------------------------------------------------- |
| Swipe on the board | move in the dominant direction (min. 24 px)                    |
| Arrow keys / WASD  | move (desktop)                                                 |
| Pause button       | menu: Resume · New game (confirm if the run has moves) · Back to menu |

Inputs during an animation are queued (at most one direction – the latest wins).

There is no undo (by design).

## Rules (engine)

`src/games/merge/logic/engine.ts` – pure and deterministic:

- Tiles slide as far as possible. Merging starts from the side the tiles move towards and
  each tile merges at most once per move: `2 2 2 2 → 4 4`, `2 2 2 → 4 2`, `4 4 8 → 8 8`.
- The score increases by the value of every merged tile.
- A move that changes nothing does not count and spawns nothing.
- After a real move a new tile appears on a random empty cell: 2 (90 %) or 4 (10 %).
- The seeded RNG state (`core/rng`) is part of the run, so a reloaded game continues exactly
  as it would have.
- The run is over when the board is full and no two neighbours are equal.
- Reaching the target shows *"You made 2048!"* once per run with *Keep playing* /
  *New game*.

`slide()` also returns where every old tile goes (`destinations`) and which tiles were
created by merges (`mergedIds`), which the view uses for the animation: tiles slide to their
destinations (merging tiles onto their partner), then merged tiles pop and the new tile
appears. With reduced motion the final board is shown immediately.

## Presentation

Tiles are absolutely positioned and moved with CSS transforms (keyed by tile id). The colour
scale (`palette.ts`) walks through hues with rising saturation and picks the text colour by
contrast; values ≥ 8192 share a dark (light theme) / light (dark theme) "high" style. Font
sizes depend on the number of digits and the tile size (container query units), so 5-digit
values fit.

## Persistence & statistics

| Key (prefix `riddles:`)      | Content                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| `merge:current:<variant>:v1` | running game: tiles, score, moves, RNG state, next id, target/keep-playing flags |
| `merge:records:v1`           | highest tile ever reached per variant                        |
| `stats:v1` → `merge`         | started / finished / best score per variant                  |

- A run is saved only once it has at least one move (opening a variant without playing leaves
  no *Continue* behind), after every move, when the app goes to the background and when
  leaving the screen.
- `recordStart` happens with the first move; `recordFinish({ score })` when the game is over
  or when a started run is replaced by *New game*. The highest tile is stored at the same
  time.
- The lobby shows per variant: *Continue · score* (if saved) or the target, best score and top
  tile. First-time players see the instructions above the list, afterwards below it.

## Files

| File                     | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `logic/engine.ts`        | rules, spawning, game over, validation         |
| `store.ts`               | saves and records                              |
| `palette.ts`             | tile colours                                   |
| `MergeLobby.vue`         | variant list, instructions                     |
| `MergePlayRoute.vue`     | keyed wrapper per variant                      |
| `MergePlay.vue`          | game flow, input, dialogs, statistics          |
| `MergeBoard.vue`         | board rendering, swipe detection, animations   |
