# Blocks

A block-placing puzzle in the genre "place pieces, clear full lines". Name, colours, artwork
and the exact rules are original; nothing is copied from a commercial title.

## Rules

- 8×8 board, a tray with **three pieces**. Pieces cannot be rotated.
- A piece fits if all its cells are inside the board and empty.
- Every **full row and full column** is cleared at once.
- When all three pieces are placed, a new tray is dealt. Up to 30 random trays are tried,
  preferring one where at least two pieces fit; a tray always contains at least one piece
  that fits as long as any shape fits at all.
- The game ends when no piece in the tray fits. Pieces that fit nowhere are shown greyed out.

## Scoring

| Event                                   | Points                                    |
| --------------------------------------- | ----------------------------------------- |
| Placing a piece                         | 1 per cell                                |
| Clearing *n* lines with one placement   | 10 · n · (n + 1) / 2 (10, 30, 60, 100 …)  |
| Combo (consecutive clearing placements) | line points × combo level                 |
| Board completely empty after a clear   | +300                                      |

A placement that clears nothing resets the combo.

## Controls

| Input                         | Effect                                                              |
| ----------------------------- | ------------------------------------------------------------------- |
| Drag a piece                  | the piece floats above the finger; a ghost shows where it lands and lines that would clear light up |
| Tap a piece, then a cell      | places the piece centred on the tapped cell (if it fits)            |
| Keys 1–3, arrows, Enter       | choose a piece, move the cursor (top-left corner), place (desktop)  |
| Pause button                  | Resume · New game (confirm) · Back to menu                          |

## Code

| File                    | Content                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `logic/pieces.ts`       | piece shapes (`[row, col]` cells) and weights                            |
| `logic/engine.ts`       | pure engine: `newRun`, `place`, `footprint`, `dealTray`, `parseRun`      |
| `BlocksBoard.vue`       | board, ghost preview, completing lines, clear and placement animations    |
| `BlockPiece.vue`        | a piece as blocks (shared bevelled block style `.bk-block`)              |
| `BlocksPlay.vue`        | HUD, tray, drag & drop, tap-to-place, keyboard, menu and result          |

The RNG state is part of the run, so a reloaded game continues exactly as before. Engine
tests include a random player (invariants) and a greedy player (games last 40+ placements
on average, guarding the difficulty of the deal).

## Storage & statistics

| Key                 | Content                                  |
| ------------------- | ---------------------------------------- |
| `blocks:current:v1` | Running game (saved after the first piece) |

Statistics variant `classic`, kind `score` (played, finished, best score).
