# Bubbles

The bubble-shooter genre: aim from the bottom, shoot a coloured bubble into a hex grid; three
or more touching bubbles of a colour pop, and everything no longer hanging on the ceiling
falls. Only the genre is shared; rules details, artwork and colours are original ("Bubble
Shooter" is a trademark, hence the name *Bubbles*). Plan: [23 – Bubbles](../../plan/23-bubbles.md).

## Modes

| Mode              | Pressure                                              | Statistics variant |
| ----------------- | ----------------------------------------------------- | ------------------ |
| Endless           | a new row after 5 misses (4 from 6 rows, 3 from 14)   | `endless`          |
| Levels            | a goal and a shot limit, no new rows                  | `levels`           |
| Against the clock | the ceiling comes down on a clock (one row at a time) | `time`             |

Statistics kind `score`. Endless and the time mode keep a best score; the time mode stores the
speed of its best score next to it (`bubbles:records:v1`). Levels record the total score of
each won level, the level to play next and the best stars per level (`bubbles:progress:v1`).

### Speeds (time mode)

A setting (lobby and *Settings → Bubbles*); a run keeps the speed it was started with.

| Speed  | Ceiling drop at the start → fastest |
| ------ | ----------------------------------- |
| Slow   | 20 s → 14 s (−0.4 s per drop)       |
| Normal | 14 s → 9 s (−0.35 s per drop)       |
| Fast   | 9 s → 6 s (−0.25 s per drop)        |

The clock starts with the first shot and waits while a shot is in flight.

## Rules (engine)

`src/games/bubbles/logic/` – pure and deterministic:

- **Grid** (`grid.ts`): 9 columns in offset rows (9 / 8 bubbles), 13 rows above the danger
  line. A pushed row flips the row parity, so every bubble keeps its place on screen.
- **Flight** (`trace.ts`): analytic – a ray from the shooter, reflected at the side walls,
  stopped by the ceiling or the first bubble within 0.82 diameters (a little less than a
  touch, so shots slip through gaps that look wide enough). The bubble snaps into the free
  cell nearest to the contact point that holds on. The aim line uses the same function.
  Angles 10° … 170°.
- **Shot** (`engine.ts`, `shoot`): pop ≥ 3 of a colour, drop what no longer hangs on the
  ceiling, score, combo, specials, misses / new rows, refill an empty field, end of the run.
  Shots only ever offer colours still on the field. The random state is stored in the run.
- **Scoring:** 10 per popped bubble; the n-th falling bubble of a shot 20 · n (at most 400);
  hits in a row multiply the shot by 1, 1.25, 1.5 … (at most 3). An empty field: +1000
  (endless, time). A won level: +100 per unused shot.
- **Specials** (endless, levels): every 8th hit in a row earns a **bomb** (clears the six
  cells around it, stones included), a shot that removes 10 or more earns a **rainbow**
  (takes the colour of the biggest touching group). Earned specials become the next bubble.
  **Stones** never pop; they fall. Endless rows have stones from row 8 on.

## Levels

`logic/levels.ts`: level n is generated from a seed of its number – the same on every device.

| Level  | Colours | Rows      | Stones          |
| ------ | ------- | --------- | --------------- |
| 1–4    | 3       | 4 → 9 (one more every 5 levels) | from level 10, up to 6 |
| 5–12   | 4       |           |                 |
| 13–30  | 5       |           |                 |
| 31+    | 6       |           |                 |

Goals repeat: clear the field, bring down the marked bubbles, pop *n* of a colour, clear,
score *n* points. Every level is played by a greedy bot (`logic/bot.ts`) before it is handed
out: its shot count is the **par** (three stars), the limit is par × 1.6 (tighter later, at
least × 1.3) + 3, at least 8. A layout the bot cannot finish is replaced, so every level is
solvable; a test plays levels 1 … 100. Stars: 3 within par, 2 up to halfway to the limit, else 1.

## Controls

| Input                        | Effect                                                  |
| ---------------------------- | ------------------------------------------------------- |
| Drag on the field            | aim; the aim line follows                               |
| Let go                       | shoot (let go below the shooter: cancel)                |
| Tap the next bubble          | swap current and next                                   |
| ← / → (Shift: fine)          | aim in 2° (0.5°) steps; shows the aim line              |
| Space, Enter, ↑              | shoot                                                   |
| X                            | swap                                                    |
| P, Escape                    | pause (time mode); a tap or Space continues             |

A second finger never shoots and pauses the time mode.

### Aim line (setting)

*Short* (first 3 bubbles of the path), *To the target* (default; the whole path with its
bounces), *With landing spot* (plus a ring where the bubble will snap in).

## Look: sci-fi

A space theme, on the level of the Shapes garden:

- **Scene** (`SpaceBackdrop.vue`, lobby and play view): sky with nebulae, two twinkling star
  layers, a ringed planet, a moon, a shooting star now and then and a neon grid floor on the
  horizon – "orbit at dawn" in the light theme, deep space in the dark one.
- **Field** (`BubblesBoard.vue`): a dark holo panel in both themes – honeycomb, scanlines,
  vignette, neon frame with corner brackets, glowing wall rails (where shots bounce), a red
  laser with emitters at the danger line (flares up and pulses twice when the field is one
  row away; the frame turns red).
- **Orbs** (`BubbleArt.vue`, gradients in `BubbleDefs.vue`, palette in `colors.ts`): a soft
  halo, a glowing body with a bright core, rim light, an energy arc and a highlight; each
  colour has its own glyph (ring, triangle, square, diamond, star, heart – can be switched
  off). Specials: *nova mine* (bomb, spiked with a blinking light), *prism orb* (rainbow,
  slowly turning wedges) and *asteroid* (stone). Level targets sit in a turning tractor ring.
- **Turret:** a dome with lights and a barrel that turns with the aim and recoils on a shot;
  the current orb sits in a chamber with a turning tick ring, the next one in a pod (a
  button: tap to swap). Barrel stripes, chamber ring and laser sight take the orb's colour.
- **Laser sight:** a glow in the orb's colour with marching white dots, flashes at wall
  bounces and, with *With landing spot*, a hologram of the orb where it will snap in.
- **Effects:** a comet tail behind a flying orb; popped orbs flare and burst into sparks and a
  ring (canvas particles, `core/particles.ts`); falling orbs drop; a nova mine sends a
  shockwave; points rise from the impact (with the combo multiplier), and big drops get a
  neon word – *Nice!*, *Great!*, *Stellar!*, *Supernova!*, *Field clear!*.
- **Console** (`console.css`): HUD, goal and hint as dark glass panels with a neon edge;
  misses until the next row as a row of energy cells; the score bumps on every hit.
- Reduced motion: no particles, tails, popups, twinkling, drifting or turning; shots fly
  faster, pops and falls only fade.

## Accessibility

- Colour **and** symbol per bubble by default.
- No time pressure in Endless and Levels; the time mode can always be paused and has three speeds.
- Fully playable with the keyboard; the next bubble is a real button.
- Screen readers: after every shot a polite summary ("3 popped, 5 fell. 41 bubbles left."),
  a warning near the line. Aiming at an angle is not practical with a screen reader
  (stated in `ACCESSIBILITY.md`).

## Files

```
src/games/bubbles/
  index.ts             descriptor (modes, score statistics, settings panel)
  routes.ts            /bubbles (lobby) and /bubbles/play/:variant
  logic/               grid, trace, engine, levels, bot, types
  useCeilingClock.ts   frame clock of the time mode
  BubblesBoard.vue     holo field, turret, aiming, flight, pops, falls, particles
  BubbleArt.vue        one orb (colour + glyph, asteroid, nova mine, prism orb)
  BubbleDefs.vue       shared gradients of the orbs
  SpaceBackdrop.vue    the space scene behind lobby and play view
  console.css          HUD / goal panels
  BubblesGoal.vue      level goal and progress
  BubblesLobby.vue     rules, modes, level, best scores, speed
  BubblesPlay.vue      HUD, board, keyboard, pause, result
  BubblesSettings.vue  aim line, symbols, speed
  settings.ts, options.ts, store.ts, colors.ts (palette), i18n.ts, i18n.de.ts, Logo.vue
```
