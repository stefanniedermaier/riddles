# TriPeaks

Clear three peaks (plan: [plan/17-card-games.md](../../plan/17-card-games.md), engine:
[cards.md](cards.md)).

## Rules

- 28 cards in three overlapping peaks (rows of 3, 6, 9, 10); a card is open when both cards
  covering it are gone. 23 cards in the stock, one on the waste.
- Tap an open card one rank higher or lower than the waste card (any suit); it becomes the new
  waste card. On Easy, ace and king connect.
- Tap the stock for the next card when nothing fits. With an empty stock and no fitting card the
  game is lost – the dialog offers *Undo*, *Try again* and *New deal*.

## Variants

| Variant | Ace–king | Deals                           |
| ------- | -------- | ------------------------------- |
| Easy    | yes      | only solvable                   |
| Medium  | no       | only solvable                   |
| Hard    | no       | any deal (often unwinnable)     |

## Points

The *n*-th card in a row scores *n* × 10 (drawing from the stock ends the streak) · +250 per
cleared peak, +1000 for the third · +50 per stock card left at a win. Plus the common rules.

## Storage

`tripeaks:current:v1`, `tripeaks:pool:v1`, `tripeaks:settings`.
