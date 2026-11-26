# Snake

The classic arcade genre (since *Blockade*, 1976): steer a snake around a grid, eat fruit to
grow and do not bite yourself. Only the genre name is shared; rules details, artwork and
colours are original. Riddles' first **real-time** game – with a calm speed that moves step
by step for players who cannot or do not want to react fast. Plan:
[22 – Snake](../../plan/22-snake.md).

## Modes

| Mode    | Board | Walls                                  | Statistics variant |
| ------- | ----- | -------------------------------------- | ------------------ |
| Classic | 15×15 | end the game                           | `classic`          |
| Open    | 15×15 | lead to the other side (dashed border) | `open`             |
| Maze    | 17×17 | end the game; stones in one of three layouts | `maze`       |

Statistics kind `score`, one best score per mode; the speed it was reached with is stored
next to it (`snake:records:v1`) and shown in the lobby.

## Speeds

A setting (lobby and *Settings → Snake*); a run keeps the speed it was started with.

| Speed  | Step at the start → fastest | Points per fruit |
| ------ | --------------------------- | ---------------- |
| Slow   | 260 → 180 ms (−4 ms per fruit) | 1             |
| Normal | 180 → 110 ms (−4 ms per fruit) | 2             |
| Fast   | 120 → 75 ms (−3 ms per fruit)  | 3             |
| Calm   | one step per input          | 1                |

## Controls

| Input                    | Effect                                                         |
| ------------------------ | -------------------------------------------------------------- |
| Swipe on the board       | turns as soon as the swipe is 24 px long; a long swipe can turn twice |
| Tap on the board         | start / continue (calm: one step straight on)                  |
| Direction buttons        | turn (calm: one step); on by default on touch screens          |
| Arrow keys / WASD        | turn (calm: one step)                                          |
| Space / P                | pause and continue                                             |
| Escape, pause button     | pause (the button opens the menu)                              |

Up to two turns are queued between two steps, so a quick "up, left" is not lost; a turn that
does not change the direction of the last queued one is dropped.

## Rules (engine)

`src/games/snake/logic/engine.ts` – pure and deterministic, `step(run, turn?)`:

- The snake starts with 3 segments in the middle, heading right.
- A turn back into the snake is ignored.
- The tail moves on in the same step, so the head may enter the cell the tail is leaving
  (unless the snake grows in that step).
- Fruit: +1 length, points by speed, new fruit on a random free cell (one draw from the list
  of free cells, seeded RNG stored in the run).
- Death: own body, a wall (classic, maze) or a stone (maze). A full board is a win.
- Maze layouts (`logic/mazes.ts`) are symmetric, keep the start row free and are tested for
  connected free cells.

## Loop and pausing

`useSnakeLoop.ts`: one `requestAnimationFrame` loop with a fixed step (time accumulates per
frame, a long frame counts as 250 ms at most) – the speed does not depend on the frame rate.
`progress` (0…1) lets the board glide the head and the tail end between two cells.

The game never moves without the player: it starts on the first input and pauses when the
app is hidden, the window loses focus, any dialog opens or a second finger touches the
board; it then waits for a tap or a key. The calm speed has no loop at all.

The run is saved after the first step on every fruit, every pause and when leaving
(`snake:current:<mode>:v1`).

## Board

SVG (`SnakeBoard.vue`): checkered field, stones, a red fruit with a leaf, the snake as one
round path with a lighter back stripe and a head with eyes looking the way it moves. In the
open mode the path is split where it passes through the border.

- Reduced motion: the snake moves cell by cell, no fruit animation, no death blink.
- Death (with motion): the snake blinks twice (well below three flashes per second), then the
  result dialog opens.

## Accessibility

- The calm speed removes all time pressure; real-time runs can always be paused.
- Head, body, fruit and stones differ in shape and brightness, not only in colour.
- Screen readers: in the calm speed every step announces the length and where the fruit is
  ("Length 7. Fruit: 3 right, 2 up."). The real-time speeds are not usable with a screen
  reader (stated in `ACCESSIBILITY.md`).

## Files

```
src/games/snake/
  index.ts           descriptor (modes, score statistics, settings panel)
  routes.ts          /snake (lobby) and /snake/play/:variant
  logic/             engine, maze layouts, types
  useSnakeLoop.ts    real-time loop and turn queue
  SnakeBoard.vue     SVG board, swipe and tap
  SnakePad.vue       direction buttons
  SnakeLobby.vue     rules, speed, modes with best score
  SnakePlay.vue      HUD, board, pause, result
  SnakeSettings.vue  speed and direction buttons
  settings.ts, speeds.ts, store.ts, i18n.ts, i18n.de.ts, Logo.vue
```
