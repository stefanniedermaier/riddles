# Design guide

How Riddles looks and moves – for the app shell and for every game. The goal is one
consistent, playful look: **glossy, outlined game art on a calm, square Material Design
UI**, with a colour of its own for every game and generous but optional animation.

Read this before you add a game or change how one looks. The values below are the ones in
the code; if you change a rule, change it here too.

## 1. Principles

1. **Each game has a colour.** `--game-<id>` is used for the lobby banner, the page
   background motif, the continue bar, buttons and highlights inside that game.
2. **The UI is square Material Design, the game art is round.** Every UI element has square
   corners and follows Material 3 (elevation, state layers, ripple – see *Material UI*);
   game elements (boards, pieces, pegs, stars, tubes, cards on the table) stay soft, glossy
   and outlined.
3. **Glossy, not flat.** Game pieces have a light spot top left, a darker rim, a dark
   outline and a white highlight (see *Game art*).
4. **Readable first.** Contrast and shape before decoration: colour is never the only cue,
   and decoration never reduces contrast below the limits in *Accessibility*.
5. **Motion is a reward, never a requirement.** Everything works and reads the same with
   reduced motion; animation is switched off there, not just shortened.
6. **Both themes are first-class.** Every colour decision is checked in light and dark.

## 2. Colour

### Tokens

All colours come from `src/styles/tokens.css`; components use tokens, never raw values.
Exceptions: game palettes (`src/games/<id>/palette.ts`) and game artwork, which must provide
light *and* dark variants where the background changes.

| Token                                  | Use                                                        |
| -------------------------------------- | ---------------------------------------------------------- |
| `--color-bg`, `--color-surface(-2/-3)` | page background, cards, insets                             |
| `--color-text`, `--color-text-muted`   | text; `--color-text` also for symbols that must flip with the theme (e.g. the spider in the Spider logo) |
| `--color-accent(-strong/-soft)`        | primary buttons, selection, focus – **the game colour inside a game** (see below) |
| `--color-error/-success/-warning`      | states; always paired with a symbol or text                |
| `--game-<id>`                          | the game's colour (light and dark variant)                 |

### The game colour is the accent inside a game

`useGameAccent()` (`src/core/gameAccent.ts`) sets `data-game` and `--game-current` on
`<html>` while a game's lobby or play view is shown; `base.css` then maps
`--color-accent*` to the game colour (darkened in light mode for contrast). So primary
buttons, selected tubes, focus rings and hint outlines are orange in Code Breaker, green in
Mines and so on – never the app's violet. `GameBackdrop` and Shapes' `GardenBackdrop` call
it; a new game gets it for free by using `GameBackdrop`.

### Dark mode

- Game colours are lighter in dark mode. Text **on** a game colour is therefore white in
  light mode and dark (`--color-bg`) in dark mode (see `ContinueButton`).
- Banners in a game colour are darkened in dark mode so white text keeps its contrast
  (`LobbyHero`).
- Fixed dark artwork (black spider, black outlines on a dark page) must switch to
  `--color-text` or get a light outline.

## 3. Shape and layout

- **Everything in the UI is square** (`border-radius: 0`): cards (`.card`), buttons
  (`AppButton`), icon buttons, dialogs (incl. win and game over), snackbars, switches,
  segmented buttons, mode cards, continue bar, rules expander, banners, notes, badges, logo
  tiles and the UI parts inside games (number pad, tool switches, HUD values, hint close).
- **Not square – game elements:** boards (small radius `--radius-md` and a frame: Shapes a
  wooden frame, Stars a dark border with a ring in the game colour, Mines a dark green
  frame), pieces, pegs, tubes, playing cards and their slots, Shapes' game-styled HUD.
- Round shapes in the UI only where the shape *is* the meaning: the trophy medallion of the
  result dialog, the loading spinner, the ripple wave.
- Content width `--content-max` (560 px); test at **360 px** width and on desktop.
- Spacing only from `--space-1 … --space-6`; touch targets ≥ `--tap-min` (44 px).

## 3a. Material UI

The UI follows Material Design 3 with square shapes.

| Element | Rule |
| --- | --- |
| Elevation | Only the tokens `--elevation-1` (cards, mode cards, rules), `--elevation-2` (hover, banners, continue bar), `--elevation-3` (dialogs, snackbars). `--shadow-sm/md/lg` map onto them. No custom shadows in the UI. |
| State layer | Hover / focus / pressed tint the element with its content colour at `--state-hover` (8 %) and `--state-pressed` (10 %) – CSS in `base.css`. No scale or lift on press. |
| Ripple | `core/ripple.ts`: a wave from the pointer on every UI control in `RIPPLE_TARGETS` (keep the list in `base.css` in sync). Add new controls there or give them `md-ripple-target`. Never on game boards. Off with reduced motion. |
| Buttons | `primary` = filled (accent), `secondary` = outlined (accent text), `ghost` = text button, `danger` = tonal error. Min. height 44 px, 600 weight, disabled 38 % opacity. |
| Switches | Material 3 switch, square: off = outlined track and a small thumb, on = filled accent track and a large thumb (`ToggleRow`, game list). |
| Segmented buttons | Outlined row; the chosen segment is tinted (`--color-accent-soft`) and shows a check mark (`SegmentedControl`). |
| Snackbar | Inverse surface, left-aligned text, elevation 3 (`ToastHost`). |
| Easing | `--ease-standard` for state changes, `--ease-emphasized` for elements that grow or move in (switch thumb). |

## 4. Typography

System font stack (`--font-sans`). Titles 800–900 weight; banner titles get a 1–2 px dark
text shadow on colour. Numbers in counters and timers use `.tabular`. Praise texts
("Great!") use a gradient fill with a dark edge (`-webkit-text-stroke` plus drop shadows).

## 5. Lobby (overview page of a game)

Every lobby uses the same building blocks, in this order:

1. `GameBackdrop` (via `LobbyHero`) – page background in the game colour with a motif:
   grid (Sudoku, Nonogram, Blocks, Merge), dots (Stars, Links, Code Breaker), stripes
   (Arrows), meadow (Mines), pipe runs (Pipes), bubbles (Water Sort), green felt (card
   games). Shapes uses its garden scene instead (`tint=false` + `GardenBackdrop`).
2. `LobbyHero` – banner in the game colour: logo on a white tile, name, tagline, a few
   faded copies of the logo. **No animation.**
3. `RulesCard` – "How to play" expander (above the menu for new players, below it later).
4. `ContinueButton` – the one continue bar for all games: game colour, details, play
   triangle. Games with one save per mode (Shapes, Merge) show "continue" in the mode card
   instead.
5. `ChoiceList` – modes/difficulties as square cards with a coloured left edge and a plain
   play triangle in the game colour (no circle).

The lobby's `<main class="page lobby">` sets `--lobby-accent: var(--game-<id>)`.

## 6. Play view

- Put `<GameBackdrop game="<id>" />` as the **first child** of the play view's `<main>`; the
  page then shares the lobby's background and gets the game accent (`base.css` gives such a
  `<main>` its own stacking context).
- Boards sit on an opaque surface so the motif never shows through cells.
- HUD values: label small and muted, value large and bold; in Shapes the HUD sits on cream
  "plates" over the garden.

## 7. Game art

### The glossy standard

Pieces, pegs, stars, flags and mines follow the Shapes pieces
(`ShapePiece.vue`, `pieceDefs.ts`):

| Layer      | How                                                                      |
| ---------- | ------------------------------------------------------------------------ |
| Body       | radial gradient, centre ≈ (0.36, 0.30): light tint → main colour → dark rim |
| Outline    | 1–2.6 px (in a 100-unit view box) in a dark shade of the main colour     |
| Highlight  | white ellipse or gradient (`white 95 % → 0 %`) top left, plus a small sparkle dot |
| Shadow     | soft contact ellipse below (`rgb(30 20 10 / 30 %)`) – **no CSS filter per piece** on large boards |

Share gradients instead of repeating them per piece: one hidden `<svg>` with the
definitions (`pieceDefs.ts`) or ids from `useId()` (`ObstacleArt`, `StarGlyph`,
`MinesBoard`, `GameArt`). A hidden defs `<svg>` must not be `display: none`.

### Examples per game

- **Shapes:** fruit with outline and gloss; obstacles: garden-bed soil with grass tufts,
  steel chains with a golden padlock, wooden crates (metal-reinforced with 2 hits).
- **Stars:** golden star with dark outline and shine on **flat** region colours (no
  gradient in the cells); red star for a conflict.
- **Mines:** covered cells as glossy meadow tiles, revealed cells sand-coloured; flag with
  wooden pole, red cloth and a mound; mine as a glossy black sphere with a red light.
- **Water Sort:** test tubes with a lip and a vertical reflection; liquid with a horizontal
  light band (`shade()` in `palette.ts`), wavy moving borders between colours, no rounded
  layer corners – the bottom layer fills the round bottom; a few scattered bubbles.

### Logos (`components/GameArt.vue`)

- 64 × 64 view box, square white tile (`--color-surface`), motif with ≥ 4 units margin.
- The motif shows the game as it looks: same colours, same pieces, same gloss.
- A soft glaze (white → transparent) covers the top of every logo (dimmed in dark mode).
- Logos must be **distinguishable at 40 px** – similar games get different motifs
  (Solitaire: tableau staircase; Spider: a spider over a king of spades; FreeCell: four
  free cells; TriPeaks: a peak).
- Check every logo on a light *and* a dark background.

### UI icons

Line icons in `src/components/icons.ts`: 24 × 24, 2 px stroke, round caps and joins,
`currentColor`. Filled only where meaning needs it (`play`, `starFilled`).

## 8. Motion

### Rules

- Every animation has a `:root[data-motion='reduced']` rule that turns it **off**
  (`animation: none`); logic that waits for animations checks `motionEnabled`.
- Use the tokens `--dur-fast/med/slow` and `--ease-out` for UI; game feedback may use
  springy curves such as `cubic-bezier(0.3, 1.6, 0.5, 1)` for pops.
- Animate `transform` and `opacity` only; no layout properties.
- No idle animation in the shell (lobby banners are static). In games, small idle loops
  are fine where they carry meaning: rocket flame, fuse spark, swinging padlock, bobbing
  arrow on drop items, waves in Water Sort.

### Game feedback (Shapes as the reference)

| Moment          | Feedback                                                                  |
| --------------- | ------------------------------------------------------------------------- |
| Match           | piece pops, juice drops and sparkles (canvas particles), points fly to the score |
| Landing         | pieces accelerate while falling and squash on impact                     |
| Big effect      | board shakes (bombs, prism strong; rockets light)                         |
| Cascade         | praise: Good! → Great! → Amazing! → Incredible!                           |
| Obstacle breaks | splinters / chain links / soil clods                                      |
| Level lost      | pieces hop and tumble off the board before the dialog                     |
| Water Sort pour | tube flies over, tilts, stream; several layers fill **one after the other** from the bottom (300 ms each); finished tube gets a cork |

### End of a game (`ResultDialog`, all games)

- *Share result* (win or new best) shares a challenge link plus an image drawn on a canvas
  (`core/shareImage.ts`): the game colour (darkened if too light), the golden trophy on rays,
  the title, a square white panel with the logo, name, difficulty and result, a gold
  "personal best" badge and the app address. The dialog shows it as a preview.

- **Win** (trophy icon, or `celebrate`): confetti cannons and rain (`CelebrationBurst`),
  golden icon on rotating rays, stars and rows pop in one after another.
- **Game over** (otherwise): grey-blue drizzle over the screen, a small rain cloud over a
  grey icon that drops in, the title sinks and shakes.
- "Game over" in endless games (Blocks, Merge, Shapes Zen/Time) celebrates only a new best.

### Particles

`src/core/particles.ts` – one canvas, shapes `drop`, `spark`, `star`, `confetti`, `ring`;
the loop runs only while particles live (max. 700). Size and speed scale with the cell
size. Never on with reduced motion.

## 9. Accessibility

- Text ≥ 4.5 : 1, large text and UI parts ≥ 3 : 1 (WCAG 2.1 AA) in **both** themes.
- Neighbouring states (covered vs. revealed in Mines, region vs. symbol in Stars) ≥ 3 : 1.
- Colour is never the only cue: symbols on Water Sort layers, shapes on Code Breaker pegs,
  "✓" / "!" for hint cells in Mines, distinct silhouettes for Shapes pieces.
- Decorative art is `aria-hidden`; game state is in the cells' `aria-label`s.
- Focus is always visible (`--color-accent`, i.e. the game colour inside a game).

## 10. Checklist for a new game or a redesign

- [ ] `--game-<id>` in light and dark in `tokens.css`; motif for `GameBackdrop`
- [ ] Logo in `GameArt.vue` in the game's own style, distinct from similar games, checked
      light and dark at 40 px
- [ ] Lobby: `LobbyHero`, `RulesCard`, `ContinueButton`, `ChoiceList`; `--lobby-accent` set
- [ ] Play view: `GameBackdrop` as first child of `<main>`
- [ ] Pieces follow the glossy standard; palette has light and dark variants
- [ ] Feedback for moves, a win and a loss; result via `ResultDialog`
- [ ] New UI controls: square, elevation tokens only, in the ripple / state-layer list
- [ ] Every animation off with reduced motion; tested at 360 px and on desktop
- [ ] Contrast checked in both themes; colour never the only cue
