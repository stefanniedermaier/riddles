# 12 – Blocks

A block-placing puzzle in the well-known genre "place pieces, clear full lines". Rules,
name, artwork and colours are original; nothing is copied from a commercial title.

## Rules

- 8×8 board, a tray with **three pieces**. Pieces cannot be rotated.
- Drag a piece onto the board (or tap a piece, then the cell for its top-left corner).
  A piece fits if all its cells are inside the board and empty.
- Every **full row and full column** is cleared at once (rows and columns that are full at the
  same time are all cleared).
- When all three pieces are placed, three new ones are dealt. A new tray always contains at
  least one piece that fits.
- The game ends when no piece in the tray fits anywhere.

## Scoring

| Event                                   | Points                                         |
| --------------------------------------- | ---------------------------------------------- |
| Placing a piece                         | 1 per cell                                     |
| Clearing *n* lines with one placement   | 10 · n · (n + 1) / 2 (10, 30, 60, 100 …)       |
| Combo (consecutive clearing placements) | line points × combo (2nd in a row ×2, …)        |
| Board completely empty after a clear   | +300                                           |

## Technical design

- `logic/pieces.ts`: the piece shapes (cells relative to the top-left corner) with weights.
- `logic/engine.ts`: pure, deterministic engine. `BlocksRun` holds board (colour per cell,
  0 = empty), tray, score, combo, moves, RNG state – a reloaded game continues identically.
  `place(run, slot, cell)` returns the new run plus cleared rows/columns for the animation.
- Single variant `classic`, statistics kind `score`, save `blocks:current:v1` (after the first
  placement).
- UI: lobby (rules, continue/new game, best score), play view with HUD, board, tray and a
  drag layer. Pointer drag with the piece floating above the finger, ghost preview and
  highlighted lines that would clear; tap-to-place and keyboard (1–3, arrow keys, Enter) as
  alternatives. Reduced motion disables the animations.
