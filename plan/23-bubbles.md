# 23 – Bubbles

**Status:** done. Open questions decided in the wizard (see *Decisions*); notes on the
implementation at the end. Docs: [docs/games/bubbles.md](../docs/games/bubbles.md).

The bubble-shooter genre: aim from the bottom, shoot a coloured bubble into a hex grid of
bubbles at the top; three or more of the same colour that touch pop, and every bubble no
longer connected to the ceiling falls. Name of the genre only – rules details, artwork,
colours and sounds are original. Riddles' 18th game.

## 0. Feasibility

**Feasible, medium effort – about the size of Snake plus the level work of Shapes.** No new
runtime dependency, no backend, fits the game API (`module.ts`) unchanged.

| Building block                      | Reuse from                                         | New work                                    |
| ----------------------------------- | -------------------------------------------------- | ------------------------------------------- |
| Module, routes, lobby, result, i18n | every game (`standardRoutes`, `PuzzleLobby`, `ResultDialog`) | –                              |
| Statistics `score`, best per mode   | Snake, Shapes, Blocks                              | –                                           |
| Real-time loop with fixed step, pause rules | `snake/useSnakeLoop.ts`, `core/dialogs.ts`, `core/touchGuard.ts` | generalise or copy for the *Time* mode |
| Levels with goals, stars, move limit | `shapes/logic/levels.ts`, bot-based tuning test (`levels.tuning.test.ts`) | bubble-specific generator and bot |
| Particles, celebration, reduced motion | `core/particles.ts`, `CelebrationBurst.vue`, `shapes/useShapesJuice.ts` | pop and fall animations |
| Seeded RNG, save slots, share links | `core/rng.ts`, `core/saveSlot.ts`, `core/share.ts`  | –                                           |
| **Hex grid geometry**               | –                                                  | new: offset rows, neighbours, snapping      |
| **Shot physics** (ray, wall bounces, collision) | –                                      | new: pure, analytic (no per-frame physics)  |
| **Aiming input** (drag, aim line, cancel) | swipe logic of Merge / Snake (thresholds only) | new                                      |

**Risks**

1. *Shot feel* – a shot that snaps into the "wrong" cell is the most common complaint in the
   genre. Mitigation: the flight path is computed analytically up front (ray against walls and
   bubbles), the aim line and the real shot use **the same function**, and the landing cell is
   the free neighbour of the hit bubble closest to the contact point. Lots of unit tests.
2. *Level balance* – mitigated as in Shapes: a greedy bot plays every generated level in a
   tuning test; levels that the bot cannot clear within the shot limit are rejected.
3. *Performance* – up to ~150 bubbles as SVG plus falling bubbles; fine on mid-range phones
   if falling bubbles are one transformed group per batch and the static grid is not
   re-rendered per frame. Check on a low-end Android early (step 3 of *Order of work*).
4. *Trademark* – "Bubble Shooter" is a registered mark; the game is called **Bubbles**.
   A look into TMview / DPMA before the release is still advised (not a legal check).

## 1. Rules

- The field is a hex grid with **9 columns** in offset rows (even rows 9 bubbles, odd rows 8,
  shifted by half a bubble). Up to **13 rows** fit; the line below row 13 is the *danger line*.
- The shooter at the bottom holds the **current** bubble; the **next** bubble is shown beside
  it. Tapping the next bubble (or `Tab` / `X`) swaps them – free and unlimited.
- The current and next bubble only ever have a colour that is still on the field (no dead
  colours near the end).
- A shot flies straight, bounces off the side walls (any number of times) and stops when it
  touches a bubble or the ceiling; it snaps into the nearest free cell.
- **Pop:** if the new bubble forms a connected group of ≥ 3 of the same colour, the group
  pops. **Fall:** every bubble no longer connected to the ceiling falls (and scores more).
- **Miss:** a shot that pops nothing. After a number of misses a new row is pushed in from
  the top (*Endless*), or the ceiling sinks on time (*Time*).
- **Game over:** a bubble ends up below the danger line. **Cleared:** the field is empty.

### Scoring

| Event                     | Points                                         |
| ------------------------- | ---------------------------------------------- |
| Popped bubble             | 10 each                                        |
| Fallen bubble             | 20 × *n* for the *n*-th fallen bubble of a shot (capped at 400 each) |
| Combo (pops in a row without a miss) | × 1 + 0.25 per combo step (max × 3) |
| Field cleared             | 1000 (Endless / Time), level bonus (Levels)    |

### Special bubbles (Endless and Levels)

| Special    | Look                       | Effect                                                    |
| ---------- | -------------------------- | --------------------------------------------------------- |
| Bomb       | dark core, fuse spark      | as a shot: pops everything within radius 1 (7 cells)      |
| Rainbow    | multi-colour ring          | as a shot: takes the colour of the group it touches with the most bubbles |
| Stone      | grey, no symbol            | in the field: cannot pop, only falls                      |

Bomb and rainbow are **earned** (every 8th combo step gives a bomb, clearing a 10-bubble
group gives a rainbow) and appear as the next bubble – no random gifts, the game stays a
skill game. Stones are part of level layouts and of later Endless rows.

## 2. Modes (statistics variants)

| Variant   | Pressure                                           | Goal                       |
| --------- | -------------------------------------------------- | -------------------------- |
| `endless` | a new row after 5 misses (4 later, then 3)         | survive, best score        |
| `levels`  | fixed shot limit, no new rows                      | level goal, 1–3 stars      |
| `time`    | the ceiling sinks one row every *n* seconds        | survive, best score        |

Statistics kind `score`: best score, games played per variant; for `levels` the highest
level reached and stars, as Shapes does.

### Levels

- Generated from a seed per level number (`logic/levels.ts`), so level 17 is the same on
  every device; no stored level data.
- Goals (one per level): **clear** the field, **free** the marked bubbles (they must fall),
  **pop** *n* of a colour, **reach** a score.
- Difficulty grows with the number of colours (4 → 6), field height, stones, and a tighter
  shot limit. Stars by remaining shots.
- A tuning test (`levels.tuning.test.ts`, like Shapes) runs a greedy bot over levels 1–100:
  every level must be solvable by the bot within the limit, and the curve must not jump.

### Time: speeds

Per-game setting **Speed** (as in Snake), fixed at the start of a run:

| Speed   | Ceiling sinks every | Speeds up to |
| ------- | ------------------- | ------------ |
| Slow    | 20 s                | 14 s         |
| Normal  | 14 s                | 9 s          |
| Fast    | 9 s                 | 6 s          |

The best score stores the speed it was reached with and shows it next to it. The calm
alternative without time pressure is *Endless* and *Levels* – both have no clock at all.

## 3. Engine (`logic/`, pure and deterministic)

```ts
type Color = 0 | 1 | 2 | 3 | 4 | 5
type Bubble =
  | { kind: 'color'; color: Color; marked?: boolean }   // marked = level target
  | { kind: 'stone' }
type Shot = { kind: 'color'; color: Color } | { kind: 'bomb' } | { kind: 'rainbow' }

interface BubblesRun {          // storage key bubbles:current:<variant>:v1
  variant: Variant
  level?: number
  speed?: Speed                 // time only
  cells: (Bubble | null)[]      // COLS × ROWS, row 0 = ceiling
  rowParity: 0 | 1              // which rows are shifted (flips when a row is pushed in)
  current: Shot
  next: Shot
  shotsLeft?: number            // levels
  misses: number
  combo: number
  score: number
  rngState: number
  over: boolean
  won: boolean
}

newRun(variant, options, seed) → BubblesRun
trace(run, angle) → { points: Point[]; cell: number; hit: number | -1 }  // aim line = shot
shoot(run, angle) → { run, phases: Phase[] }
swap(run) → BubblesRun
pushRow(run) → BubblesRun     // endless / time
```

- `trace` is analytic: the ray is reflected at the side walls, and the first bubble it hits
  is found by ray–circle intersection with a slightly smaller collision radius (≈ 0.8 ×)
  so shots slip through narrow gaps as players expect. The aim line and `shoot` both call it.
- `shoot` returns **phases** for the UI, like Shapes: `fly` (path), `snap`, `pop` (cells),
  `fall` (cells), `push` (new row), `special`. The UI animates them one after the other;
  the engine state is final at once (save and reload never see a half move).
- Angles are limited to 10°–170° (no horizontal shots).
- Colours of new rows and shots come from `core/rng`; `rngState` is stored so a reloaded run
  continues identically.

## 4. Loop (`time` only)

- The Snake loop pattern (`requestAnimationFrame`, fixed step, max frame 250 ms) counts down
  to the next ceiling drop; extract the shared part into `core/` if it stays small
  (`useFixedStepLoop`), otherwise a separate `useCeilingClock.ts`.
- Pauses automatically on hidden page, dialog, window blur and second finger; continuing
  shows "Ready – tap to continue". A shot in flight finishes first.
- *Endless* and *Levels* have no clock; animations only run after a shot.
- The run is saved after every shot and on every pause.

## 5. Rendering

- **SVG** board scaled to the play area width (portrait first), theme tokens; the grid is
  static and only re-rendered after a shot; flying and falling bubbles are separate layers
  animated with `transform`.
- Bubbles: glassy circle with a highlight and an embossed **symbol** per colour
  (circle, triangle, square, diamond, star, heart – different from Shapes' set where
  needed). **Setting "Symbols on bubbles"** (default on); off shows plain colours, the
  rules card points out that symbols help to tell colours apart.
- Aim line: dotted, fades out; length per **setting "Aim line"**:
  `short` (first segment only), `target` (up to the first bubble, through bounces –
  **default**), `full` (target plus a ghost bubble on the landing cell).
- Pop: short scale-out and a few particles; fall: bubbles drop with gravity and fade.
  Reduced motion: no particles, pop and fall are a quick fade, the shot still travels
  (so the bounce stays readable) but faster.
- Danger line: subtle dashed line; the bottom row blinks at most twice (≤ 3 flashes/s,
  WCAG 2.3.1) when the field is one row from the line; reduced motion: colour change only.
- Original motifs only: no look, artwork or sounds of an existing bubble shooter.

## 6. Input

- **Drag to aim, release to shoot:** pointer down anywhere on the board shows the aim line
  towards the pointer; moving updates it; releasing shoots. Dragging back below the shooter
  (or `Escape`) cancels. `touch-action: none` on the board.
- The pointer position *is* the target (no relative drag sensitivity), which is precise
  enough at 9 columns; the keyboard offers fine steps for exact angles.
- **Keyboard:** ← / → turn the aim (Shift = fine steps), Space / Enter shoots, Tab / X swaps,
  P pauses (time). Every action has a button for touch (swap = tap the next bubble).
- Multi-touch guard (`core/touchGuard.ts`): two fingers never shoot and pause *Time*.
- Input is locked while a shot is animated (≈ 300–600 ms, shorter under reduced motion).

## 7. UI

- **Lobby** (`/bubbles/`): three modes with best score (level: highest level and stars),
  speed picker for *Time*, *Continue* per mode, level selection grid as in Shapes.
- **Play** (`/bubbles/play/:variant`): HUD with score, shots left (levels) or misses until
  the next row (endless) or a ceiling timer (time), goal (levels); board; shooter with
  current / next bubble.
- **Result dialog:** score, new best, stars (levels), *Next level* / *New game*, share
  icon (challenge link with the score or level, as in Merge, Blocks and Snake).
- **Settings panel** (`bubbles:settings`): *Aim line* (short / to target / with landing
  cell), *Symbols on bubbles* (on/off), *Speed* (time).

## 8. Accessibility

- Colour **and** symbol per bubble by default; the symbol switch only removes the extra cue
  for players who prefer it. Colours checked for contrast in light, dark and high contrast,
  and the 6 colours stay distinguishable under the common colour-vision deficiencies.
- No time pressure in *Endless* and *Levels*; *Time* can always be paused and slowed down
  (WCAG 2.2.1 / 2.2.2).
- Fully playable with the keyboard; focus stays on the board during play.
- Screen readers: the board is an image with a summary after each shot ("3 popped, 5 fell,
  12 bubbles left, next row in 2 misses"). Aiming at a precise angle is not practical with a
  screen reader; `ACCESSIBILITY.md` says so honestly.

## 9. App integration

- `src/games/bubbles/` with `index.ts` (descriptor: variants, `statKind: 'score'`,
  `hasSavedGame`, settings panel), `routes.ts`, `module.ts`, `i18n.ts`, `i18n.de.ts`
  (`seo.about` with the genre name "bubble shooter"), `settings.ts`, `store.ts`, `Logo.vue`,
  `BubblesLobby.vue`, `BubblesPlay.vue`, `BubblesBoard.vue`, `BubbleArt.vue`,
  `BubblesShooter.vue`, `BubblesRules.vue`, `BubblesSettings.vue`, `useBubblesAnimator.ts`,
  `logic/{grid,trace,engine,levels,scoring,types}.ts`.
- Register in `src/games/modules.ts` and both text catalogues.
- Design checklist (design guide §10): accent colour `--game-bubbles` (a free hue – check
  against the existing game accents), backdrop motif in `GameBackdrop.vue`, logo.
- Search engines: slug `bubbles` (prerender, sitemap, hreflang come from the module list),
  OG images via `npm run og-images`; "13 more" → "14 more" in the app description
  (`en.ts`, `de.ts`, manifest, `package.json`).
- Docs: `docs/games/bubbles.md`, README game table, CHANGELOG, `ACCESSIBILITY.md`,
  this plan in `plan/README.md`.
- Size: lazy chunk; the start bundle only grows by descriptor, logo and texts (≈ 1.5 kB gzip).

## 10. Tests

- **Grid:** neighbours in both row parities, cell ↔ position, row push flips parity.
- **Trace:** straight shots, one and several wall bounces, ceiling hit, narrow gaps,
  landing cell next to the contact point, angle limits; `trace` and `shoot` agree.
- **Engine:** pop at ≥ 3 only, fall of disconnected bubbles (incl. stones), specials
  (bomb radius, rainbow colour choice), shot colours only from colours on the field, miss
  counter and row push, game over at the danger line, cleared field, scoring and combo cap,
  same seed → same run, save/reload mid-run.
- **Levels:** deterministic per level, all goals reachable, tuning bot clears levels 1–100
  within the shot limit, no difficulty jumps.
- **Clock** (fake timers, stubbed rAF): fixed drops independent of frame rate, pauses on
  hidden page / dialog / second finger, speed table.
- **Components:** aim line per setting, swap, keyboard control, symbols on/off, HUD and
  result dialog, live summary.
- **E2E** (desktop and mobile, with axe): play a level by keyboard with a fixed seed
  (deterministic angles), pop and drop bubbles, finish with the result dialog; continue
  after reload; *Time* pauses when the page is hidden.

## 11. Order of work

1. Hex grid and `trace` with tests (the core risk first).
2. Engine: pop, fall, misses, rows, specials, scoring – with tests.
3. Board, shooter, aim input, animations; early check on a low-end phone.
4. Modes: Endless, Levels (generator + tuning bot), Time (clock, speeds).
5. Lobby, settings, result dialog, texts DE/EN.
6. Logo, backdrop, accent colour, OG images, SEO texts.
7. Accessibility pass, e2e tests, docs, release.

**Rough estimate:** 1 ≈ 1 day, 2 ≈ 1–2 days, 3 ≈ 2 days, 4 ≈ 2–3 days (levels are the
long pole), 5–7 ≈ 2 days – about **8–10 working days**, comparable to Snake + Shapes levels.

## Decisions

From the wizard:

1. **Modes:** `endless`, `levels` and `time` from the start; no daily puzzle (plan 19 is
   still an evaluation).
2. **Control:** drag to aim, release to shoot, drag back to cancel; keyboard as above.
3. **Aim line:** a setting – short / up to the target / with landing cell; default
   "up to the target".
4. **Name:** "Bubbles" (generic; "Bubble Shooter" is a trademark).
5. **Specials:** few – bomb, rainbow (both earned), stone (layouts); plus free swapping with
   the next bubble.
6. **Look:** colour + symbol per bubble; symbols can be turned off in the settings.
7. **Time mode:** pausable, speed setting slow / normal / fast; best score shows the speed.

## Notes on the implementation

- **Levels are played in order** (as in Shapes): the lobby shows the current level and the
  stars collected; there is no level selection grid.
- **Level calibration at runtime:** `getLevel(n)` lets the bot play the layout and sets par
  and shot limit from its shot count (about 25 ms per level in Node, cached). Limit:
  par × 1.6 (down to × 1.3 for later levels) + 3, at least 8. Level 1 starts with 3 colours.
- **"Free the marked bubbles"** counts a marked bubble as freed when it pops *or* falls.
- **Time mode:** "the ceiling sinks" is a new row pushed in at the top, like Endless; the
  clock starts with the first shot and waits while a shot is in flight. No specials in this
  mode.
- **Swap key:** `X` only (Tab stays the focus key); ↑ also shoots.
- **Colours** are tokens (`--bubble-0 … 5`, `--bubble-stone`) in `tokens.css`, light and dark;
  the accent `--game-bubbles` is a deep sky blue.
- **Size:** the game adds about 13 kB gzip; the total budget in `scripts/check-dist.mjs` was
  raised from 360 to 375 kB.
