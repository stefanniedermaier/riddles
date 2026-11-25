# Spider

Two decks, ten columns (plan: [plan/17-card-games.md](../../plan/17-card-games.md), engine:
[cards.md](cards.md)).

## Rules

- 104 cards: 6 in the first four columns, 5 in the others (top card face up), 50 in the stock.
- Any card goes on a card one rank higher; only runs of one suit move together; any card or run
  may go to an empty column.
- A run king → ace of one suit leaves the table (8 runs win).
- Tap the stock to deal one card onto every column – only when no column is empty.

## Difficulties

1 suit (♠), 2 suits (♠ ♥), 4 suits. With *Only solvable deals*, 1 and 2 suits are solver-checked;
4 suits are accepted after a few attempts even without a proof (the lobby rules say that not every
4-suit deal can be solved).

## Points

Start 500 · −1 per move (dealing included) · +100 per completed run. Plus the common rules.

## Storage

`spider:current:v1`, `spider:pool:v1`, `spider:settings`.
