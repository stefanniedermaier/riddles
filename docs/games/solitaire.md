# Solitaire

The classic patience (genre *Klondike*, plan: [plan/17-card-games.md](../../plan/17-card-games.md),
engine: [cards.md](cards.md)).

## Rules

- 7 columns with 1–7 cards (top card face up), 24 cards in the stock, 4 foundations (one per suit).
- Columns: build down in alternating colours; any face-up run can move; only a king goes to an
  empty column. Uncovered cards turn up.
- Foundations: ace to king by suit; cards can come back from a foundation.
- Stock: deal 1 or 3 cards to the waste; only the top waste card plays.
- *Finish* plays the rest once stock and waste are empty and every card is face up.

## Variants (= statistics variants)

| Variant               | Draw | Turning the waste over |
| --------------------- | ---- | ---------------------- |
| Draw 1                | 1    | unlimited              |
| Draw 1 · one pass     | 1    | never                  |
| Draw 3                | 3    | unlimited              |
| Draw 3 · three passes | 3    | twice (three passes)   |

The HUD shows the passes left for the limited variants. *Draw 1 · one pass* is almost never
winnable: the solver proves most of these deals unsolvable, so *Only solvable deals* does not
apply to it (the rules in the game say so).

## Points

+10 to a foundation · +5 waste → column · +5 turning up a card · −15 foundation → column ·
turning the waste over: first time free, then −50 (draw 1) / −20 (draw 3). Plus the common rules
in [cards.md](cards.md).

## Storage

`solitaire:current:v1` (seed, variant, moves), `solitaire:pool:v1`, `solitaire:settings`.
