# 22 – Snake

**Status:** done. Open questions decided (see the end); notes on the implementation at the end.

The classic arcade genre: steer a snake around a grid, eat food to grow, and do not bite
yourself (or hit a wall). Name of the genre only; rules details, artwork, colours and sounds
are original. Riddles' 17th game and its first **real-time** game, so it needs things the
other games do not have: a game loop, pausing and a calm mode for players who cannot react
fast (see *Accessibility*).

## 1. Rules

- Square board; the snake starts with 3 segments in the middle, heading right. One food item
  is on the board at a time, never on the snake.
- The snake moves one cell per step in its current direction. The player turns it by
  90°; turning back into itself (a 180° turn) is ignored.
- Eating food: the snake grows by one segment (the tail stays where it is for one step),
  the score rises and new food appears on a random free cell (seeded RNG).
- The game ends when the head moves into the snake's own body or – depending on the mode –
  into a wall or an obstacle. Moving into the cell the tail is just leaving is allowed.
- The board is completely filled: the game is won (rare, but has to be handled: no free cell
  for food).

## 2. Modes (statistics variants)

| Variant   | Board | Walls                     | Notes                                           |
| --------- | ----- | ------------------------- | ----------------------------------------------- |
| `classic` | 15×15 | deadly                    | the standard                                    |
| `open`    | 15×15 | wrap around to the other side | easier; good first mode                    |
| `maze`    | 17×17 | deadly, plus obstacles    | a fixed set of original obstacle layouts, chosen by seed |

Statistics kind `score`: best score, games played, total length eaten per variant. The lobby
shows the best score per mode.

### Speed and the calm mode

A per-game setting **Speed** (`snake:settings`, settings panel and the lobby):

| Speed   | Step at the start | Speeds up as the snake grows                        |
| ------- | ----------------- | --------------------------------------------------- |
| Slow    | 260 ms            | to at most 180 ms                                   |
| Normal  | 180 ms            | to at most 110 ms                                   |
| Fast    | 120 ms            | to at most 75 ms                                    |
| **Calm** (step by step) | – | the snake moves only when the player gives a direction (one step per input; the same direction again = one step forward) |

Points per food: `1` (slow), `2` (normal), `3` (fast), `1` (calm), so faster play pays off.
**One best score per mode**; the speed it was reached with is stored with it and shown next
to it (lobby, statistics, result dialog).

## 3. Engine (`logic/`, pure and deterministic)

```ts
type Direction = 'up' | 'down' | 'left' | 'right'
interface SnakeRun {             // storage key snake:current:<variant>:v1
  variant: Variant
  size: number
  speed: Speed                   // fixed at the start of a run
  body: number[]                 // cell indices, head first
  direction: Direction
  food: number                   // cell index, -1 when the board is full
  obstacles: number[]            // maze only
  score: number
  eaten: number
  steps: number
  rngState: number               // core/rng → a reloaded run continues identically
  over: boolean
  won: boolean
}

newRun(variant, speed, seed) → SnakeRun
step(run, turn?: Direction) → { run, ate: boolean, died: boolean }
stepInterval(run) → number       // ms for the current length and speed
```

- `step` is the only rule function: applies a turn (if valid), moves, grows, places food.
  No timers, no DOM – trivial to unit test and identical in the calm mode.
- Food is placed with `rng` over the list of free cells, so it never takes more than one
  draw (no retry loop near the end of a game).
- The maze layouts are data (`logic/mazes.ts`), symmetric, with a free start corridor;
  a test checks that all free cells are connected.

## 4. Game loop (`useSnakeLoop.ts`)

- One `requestAnimationFrame` loop with a **fixed step**: accumulates elapsed time and calls
  `step()` every `stepInterval` ms; draws in between (interpolation, see *Rendering*). Never
  `setInterval` (drifts, keeps running in the background).
- **Input queue:** up to two buffered turns, so a quick "up, left" is not lost between two
  steps; a turn that is the opposite of the last queued direction is dropped.
- **Pauses automatically** when the page is hidden, when a dialog opens (`core/dialogs.ts`),
  when the window loses focus and when a second finger touches the board
  (`core/touchGuard.ts`). Continuing after a pause shows a short "Ready – tap to continue"
  overlay; the snake never starts moving without the player.
- The run is saved on every food eaten and on every pause (not on every step), so a reload
  or an app switch continues from the last pause.
- Calm mode: no loop at all; every input calls `step()` directly.

## 5. Rendering

- **SVG** board (as in the other games; theme tokens, crisp at any zoom). The snake is one
  `<path>` through the segment centres with round joins and caps; a separate head with eyes
  that look in the moving direction; the tail tapers. Food as an original fruit/berry motif
  (shape, not only colour). Obstacles as stones.
- Smooth movement: between two steps the head and tail ends are interpolated along the path
  (normal motion). Under **reduced motion** the snake jumps cell by cell (no interpolation,
  no eating "gulp", no particles) – the game stays fully playable.
- Subtle grid (checkerboard), clear border in `classic` / `maze`, dashed border in `open` to
  show that walls wrap.
- Death: the snake blinks twice (no fast flashing: at most 2 flashes, ≤ 3 per second –
  WCAG 2.3.1) and the result dialog opens. Reduced motion: no blinking.
- Board size: fits the shorter side of the play area, portrait-first as all games.

## 6. Input

- **Swipe** anywhere on the board (reuse the threshold logic of `MergeBoard.vue`, 24 px,
  dominant axis) – a swipe turns immediately when the threshold is crossed, not on lift,
  so turns feel direct. `touch-action: none` on the board while running (the board must not
  scroll), `pinch-zoom` while paused.
- **On-screen D-pad** below the board (setting, **on by default** on touch devices): four large
  buttons (≥ 56 px), for players who find swiping hard. With the calm mode it is the main
  control.
- **Keyboard:** arrow keys and WASD; Space / P / Escape pauses.
- Multi-touch guard as in every game (`core/touchGuard.ts`): two fingers never count as a
  turn and pause the game.

## 7. UI

- **Lobby** (`/snake/`): modes with best score, speed picker, *Continue* per mode when a run
  is saved, short how-to for first-time players (shared lobby components).
- **Play** (`/snake/play/:variant`): HUD with score, length, best score and a pause button;
  board; D-pad; "Swipe or use the arrow keys" hint until the first turn.
- **Result dialog** (`ResultDialog.vue`): score, length, new best, *New game*, menu and home
  icons, share icon in the corner (challenge link with the score, as in Merge and Blocks).
- Pause overlay: *Continue*, *Restart*, *Rules*.

## 8. Accessibility

- The calm mode makes the game playable without time pressure (motor impairments, low
  vision with magnification, cognitive load) – WCAG 2.2.1 / 2.2.2: the moving game can
  always be paused, and the speed can be lowered.
- Head, body, food and obstacles differ in shape and brightness, not only in colour; checked
  in light, dark and high contrast.
- Zoomed in with pinch zoom or screen magnification, the game pauses as soon as a second
  finger touches the board, and the calm mode keeps the view still.
- Screen readers: the board is an image with a live summary ("Length 7, food 3 right, 2 up")
  announced politely after each step **only in the calm mode**; in real time the game would
  flood the reader. `ACCESSIBILITY.md` states honestly that the real-time modes are not
  usable with a screen reader and points to the calm mode.

## 9. App integration

- `src/games/snake/` with `index.ts` (descriptor: variants, `statKind: 'score'`,
  `hasSavedGame`, settings panel), `routes.ts` (`standardRoutes`), `module.ts`, `i18n.ts`,
  `i18n.de.ts` (`seo.about` with the genre name), `settings.ts`, `Logo.vue`, `SnakeLobby.vue`,
  `SnakePlay.vue`, `SnakeBoard.vue`, `SnakePad.vue`, `SnakeRules.vue`, `useSnakeLoop.ts`,
  `logic/{engine,mazes,types}.ts`.
- Register in `src/games/modules.ts` and both text catalogues
  (`src/i18n/locales/messages.{en,de}.ts`).
- Design checklist (design guide §10): accent colour `--game-snake`, backdrop motif in
  `GameBackdrop.vue`, logo motif.
- Search engines: slug `snake` (prerendered pages, sitemap and hreflang come from the module
  list), OG images via `npm run og-images`; "12 more" → "13 more" in the app description
  (`en.ts`, `de.ts`, manifest, `package.json`).
- Docs: `docs/games/snake.md`, README game table, CHANGELOG, `ACCESSIBILITY.md`, this plan
  in `plan/README.md`.
- Size: the game is a lazy chunk; the start bundle only grows by the descriptor, the logo
  and the texts (≈ 1.5 kB gzip).

## 10. Tests

- **Engine:** moving, growing (tail stays one step), every death (wall, self, obstacle),
  wrapping in `open`, moving into the leaving tail is allowed, 180° turns ignored, food
  never on the snake or an obstacle, a full board ends as won, same seed → same run,
  `stepInterval` per speed and length. Maze layouts: all free cells connected.
- **Loop** (fake timers and a stubbed `requestAnimationFrame`): fixed steps independent of
  the frame rate, input queue (two turns between steps, opposite turns dropped), pauses on
  hidden page / dialog / second finger, saves on pause.
- **Components:** HUD and result dialog, D-pad buttons, keyboard control, the live summary
  in the calm mode.
- **E2E** (desktop and mobile, with axe): play a short game in the calm mode with the
  keyboard (deterministic, no timing), eat food, die, see the result dialog; continue a
  saved run after a reload; the real-time mode pauses when the page is hidden.

## 11. Order of work

1. Engine with tests (rules, modes, mazes).
2. Loop and input with tests.
3. Board rendering, lobby, play view, settings, texts.
4. Logo, backdrop, accent colour, OG images, SEO texts.
5. Accessibility pass (calm mode, contrast, live summary), e2e tests, docs.

## Decisions

1. **Best scores:** one list per mode; the speed is shown next to the best score.
2. **Modes:** `classic`, `open` and `maze` from the start.
3. **D-pad:** on by default on touch devices (`pointer: coarse`), can be turned off in the
   settings.
4. **Name:** "Snake". It is the common name of the genre (since *Blockade*, 1976), used by
   countless games and apps; the one game mark found in a search (Nokia's US mark "SNAKES",
   2008) has been cancelled. No logo, artwork, sound or look of an existing Snake game is
   used. Not a legal check – a look into TMview / DPMA before the release is advised.

## Notes on the implementation

- Colour: `--game-snake` is a plum/fuchsia (green is taken by Mines, teal by Links).
- The tail does not taper; a lighter back stripe keeps the body readable where it touches
  itself.
- The snake is drawn one step behind the engine and glides towards the current state
  (`progress`), so the drawing never shows a cell the engine has not reached.
- The speed of the best score is shown in the lobby and the result dialog; the statistics
  view stays generic.
- Docs: [docs/games/snake.md](../docs/games/snake.md).
