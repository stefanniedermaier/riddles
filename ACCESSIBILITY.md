# Accessibility

Riddles should be playable by as many people as possible – also with low vision, colour
vision deficiency, motor impairments, a screen reader or a keyboard. The target is
**WCAG 2.2 level AA**. This document describes what the app offers today, how it is
tested, the known limitations and how to report a barrier.

## What the app offers

### Seeing

- **Contrast:** text at least 4.5 : 1, large text and controls at least 3 : 1 – in the
  light **and** the dark theme.
- **Colour is never the only cue:** every Shapes piece has its own silhouette and texture
  (rockets and dynamite too), Water Sort layers carry symbols, Code Breaker pegs have
  shapes, hint cells in Mines show "✓" / "!"; in Snake head, body, fruit and stones differ
  in shape and brightness.
- **Dark mode:** follows the system or can be set in *Settings*.
- **Zoom:** the page can be zoomed with two fingers – also on the game boards; a
  two-finger gesture never counts as a move.

### Motion

- **Reduced motion:** follows the system setting (e.g. Android's *Remove animations*,
  iOS *Reduce Motion*) or can be set in *Settings → Animations*. Animations, confetti and
  board effects are then off; moves in Shapes are still shown step by step (swap, matches,
  refill), so what happens on the board stays understandable.
- No flashing content.

### Operating

- **Keyboard:** every game can be played with a keyboard – a visible cursor on the board
  (arrow keys, Enter / Space), Ctrl / ⌘ + Z to undo where the game has undo. Focus is
  always visible.
- **Touch targets** are at least 44 × 44 px.
- **No time pressure** except in modes that are about time (Shapes *Time*, Snake's
  real-time speeds); all puzzles can be paused and resumed later, also after closing the app.
- **Snake** pauses by itself (app in the background, a dialog, a second finger) and only
  moves on after a tap or a key. Its *Calm* speed has no time pressure at all: the snake
  moves one step per input. Direction buttons are on by default on touch screens.
- **Mines:** the long-press action can be switched off (*Settings → Mines*).

### Screen readers

- Pages, dialogs and controls have accessible names; dialogs keep the focus inside and
  return it when they close.
- Game boards describe their cells (e.g. "row 3, column 5: flowers, dynamite"); decorative
  art is hidden from screen readers.
- Icon-only buttons (share, game menu, home, …) have labels.

### Language

- English and German, following the device language or set in *Settings*.

## How it is tested

- **Automated:** every pull request and deployment runs Playwright end-to-end tests with
  [axe](https://github.com/dequelabs/axe-core) against the production build – every page
  in the light and the dark theme, on desktop and mobile – and fails on any WCAG 2.2 A/AA
  violation axe can detect.
- **Unit tests** cover keyboard play, labels and touch handling of the boards.
- **Manually** on Android and iOS phones; reports from players with assistive settings
  have led to fixes (e.g. two-finger zoom, step-by-step moves with reduced motion).

Automated tools find only part of all barriers – reports from real use are very welcome.

## Known limitations

- The puzzles are visual by nature. Boards can be played with a screen reader and a
  keyboard, but larger puzzles (e.g. Nonogram 15×20 or Spider) are tedious that way.
- Shapes *Time* mode has a time limit by design; *Zen* and *Levels* have none.
- Snake in real time cannot be played with a screen reader – it moves faster than a reader
  can announce. The *Calm* speed announces the length and where the fruit is after every
  step.
- Drag and drop (cards, Blocks) has alternatives: tap to select and tap the target, or the
  keyboard.

## Reporting a barrier

Please open an
[accessibility report](https://github.com/stefanniedermaier/riddles/issues/new?template=accessibility.yml).
Helpful details: the game or page, what you tried, the assistive technology or setting you
use (screen reader, zoom, font size, reduced motion …), device and browser. Without a
GitHub account you can write an email – the address is in the app's
[imprint](https://stefanniedermaier.github.io/riddles/imprint/).

Accessibility problems are treated as bugs, not as feature requests.
