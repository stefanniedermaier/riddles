# FreeCell

All cards open, free cells to park cards (plan: [plan/17-card-games.md](../../plan/17-card-games.md),
engine: [cards.md](cards.md)). Deals are our own seeded shuffles – no deal numbers of other apps.

## Rules

- 52 cards face up in 8 columns (7, 7, 7, 7, 6, 6, 6, 6); 4, 3 or 2 free cells; 4 foundations.
- Columns: build down in alternating colours; any card may go to an empty column or a free cell.
- A run moves at once when there is room: (free cells + 1) × 2^(empty columns), counted without
  the target if it is an empty column.
- *Safe automatic moves* (default on): cards no other card can still need go to the foundations.
- *Finish* appears when every column is in descending order.

## Variants

4 free cells (classic), 3 and 2 free cells – all solver-checked with *Only solvable deals*.

## Points

+10 to a foundation · −1 per move. Plus the common rules.

## Storage

`freecell:current:v1`, `freecell:pool:v1`, `freecell:settings`.
