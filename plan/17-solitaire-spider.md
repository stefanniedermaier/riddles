# Plan 17 – Solitaire and Spider (card games)

Two classic patience games that share one card engine:

- **Solitaire** – the classic patience (genre *Klondike*): build four foundations from ace
  to king, using seven tableau columns and a stock.
- **Spider** – two decks, ten columns: build complete runs from king to ace in one suit,
  which then leave the table.

Generic rules that are centuries old; names, card design, animations and layout are
original. Nothing is taken from commercial versions (no green felt look, no copied card
backs or face illustrations, no "bouncing cards" win animation).

## 1. Shared card engine

The conventions forbid imports between game folders, so the shared parts go to `core` and
`components`:

| Where                               | What                                                           |
| ----------------------------------- | -------------------------------------------------------------- |
| `src/core/cards/cards.ts`           | `Card` (`suit` 0–3, `rank` 1–13, `faceUp`), decks (1 or 2), seeded shuffle, colour, labels |
| `src/core/cards/history.ts`         | undo stack of moves (compact, serialisable)                    |
| `src/components/cards/PlayingCard.vue` | one card as SVG: rank and suit symbol, face-down back          |
| `src/components/cards/CardTable.vue`   | columns/piles layout, fanning, drag & drop, tap-to-move, keyboard, move animations |

### Card design

- **Suit symbols as SVG paths**, not Unicode characters: on iOS ♥/♦ are often drawn as
  coloured emoji, and fonts differ.
- Large rank and suit in the top-left corner (readable when fanned), a big suit symbol in the
  middle. J, Q and K show the letter and suit only – no illustrations (original, and small).
- Back: an original geometric pattern in the game colour.
- Colours: red suits ≥ 4.5:1 and black suits ≥ 4.5:1 on the card face in both themes; card
  edge ≥ 3:1 against the table. Setting **Four-colour suits** (default off): ♣ green, ♦ blue
  – colour is never the only signal anyway (the suit symbol is always there).

### Layout (phone portrait first)

- Card width from the column count: Solitaire (7 columns) ≈ 44 px at 360 px width,
  Spider (10 columns) ≈ 31 px – enough for corner rank + suit, tap targets ≥ 24 px (WCAG 2.5.8).
- Fanning: face-down cards overlap more (≈ 15 % of the card height) than face-up cards
  (≈ 28 %). A tall column compresses its overlap so it never leaves the screen.
- Landscape and tablets: larger cards, centred table.

### Input

| Action                    | Effect                                                                    |
| ------------------------- | ------------------------------------------------------------------------- |
| Tap a card                | **smart move**: to the foundation if possible, otherwise to the best legal column (prefers a column that uncovers a card, avoids empty columns for non-kings) |
| Drag a card / a run       | drop on any legal pile; ghost preview, illegal drops snap back            |
| Tap, then tap a pile      | alternative to dragging (setting **Tap moves automatically** off → select first) |
| Tap the stock             | deal (Solitaire: draw 1 or 3; Spider: one card on every column)           |
| Keyboard                  | arrow keys move between piles/cards, Enter picks up / drops, Space smart move, D deals, U or Ctrl+Z undo |

Moves animate (≈ 180 ms, card flies from its old to its new position); reduced motion →
instant. Drag uses pointer events with pointer capture, like Blocks.

### Accessibility

- Every pile is a list (`role="list"`), every reachable card a button with a label
  ("7 of hearts", "face-down card", "empty column 3", "stock: 12 cards").
- Moves are announced in a polite live region ("7 of hearts to column 4").
- Keyboard covers everything the pointer can do; focus stays on the moved card's pile.

## 2. Solitaire (Klondike)

### Rules

- One deck. Tableau: 7 columns with 1–7 cards, the top card face up. Stock: the rest.
- Tableau: build down in **alternating colours**; any face-up run can move. An empty column
  only takes a king (or a run starting with a king). A face-down card turns up when it is
  uncovered.
- Foundations: one per suit, ace to king. Cards can also be moved back from a foundation.
- Stock: deal **1 or 3** cards to the waste; only the top waste card plays. When the stock is
  empty it is turned over again – unlimited passes.
- Won when all 52 cards are on the foundations. **Auto-finish**: as soon as the stock and waste
  are empty and every card is face up, a button (and an automatic prompt) plays the rest.

### Variants and statistics

| Variant  | Statistics | Note                                         |
| -------- | ---------- | -------------------------------------------- |
| Draw 1   | time, moves | easier                                      |
| Draw 3   | time, moves | classic, harder                             |

Setting **Only solvable deals** (default on): every deal is checked by the solver (§ 4); a
deal the solver cannot finish within its budget is replaced. With the setting off, every
random deal is accepted (≈ 80 % are solvable at Draw 1).

## 3. Spider

### Rules

- Two decks (104 cards). Tableau: 10 columns, 6 cards in the first four, 5 in the others
  (54), top cards face up. Stock: 50 cards = 5 deals.
- Build down **regardless of suit**, but only a run of **one suit** can move together.
  Any card or run may go to an empty column.
- A complete run king → ace of one suit leaves the table automatically (8 runs to win).
- Dealing puts one card face up on every column – only allowed when no column is empty
  (classic rule).

### Difficulties

| Difficulty | Suits | Note                                      |
| ---------- | ----- | ----------------------------------------- |
| Easy       | 1 (♠) | almost every deal solvable                |
| Medium     | 2 (♠ ♥) |                                         |
| Hard       | 4     | the classic, needs planning               |

Statistics per difficulty: time and moves; a given-up game counts as started, not finished.
*Only solvable deals* (default on) applies to 1 and 2 suits (solver-checked). For 4 suits the
solver often needs too long on a phone; deals there are accepted if the solver finds a
solution within its budget, otherwise drawn again a few times and then accepted anyway –
the lobby says "4 suits: not every deal can be solved".

## 4. Solver and hints (`logic/`, in a worker)

- **Klondike solver**: depth-first search with a transposition table over canonical states
  (tableau columns sorted, waste/stock as position), move ordering (to foundation, uncover a
  face-down card, king to empty column, from waste, stock last), safe automatic foundation
  moves (a card whose rank ≤ both opposite-colour foundations + 1), node budget (≈ 200 000).
  Returns a move list.
- **Spider solver**: same idea for 1 and 2 suits (moves that build same-suit runs first,
  then uncovering, then dealing), node budget; 4 suits best-effort.
- **Hint**: the next move of a solution from the current state (both piles highlighted,
  *Apply* plays it). Following hints walks along the same solution (as in Water Sort). If the
  solver finds none: a heuristic best move (uncover a face-down card, build a same-suit run,
  empty a column) is shown with "This may not lead to a win"; with no legal move at all:
  "No moves left – undo or deal".
- Deals are generated and checked in a worker behind a puzzle pool (`<game>:pool:v1`), so
  "New game" is instant.

## 5. Persistence

```ts
interface SolitaireSave {          // solitaire:current:v1  /  spider:current:v1
  seed: number
  variant: 'draw1' | 'draw3'       // Spider: suits 1 | 2 | 4
  state: TableState                // piles of cards (rank, suit, faceUp) – compact arrays
  history: Move[]                  // undo (moves incl. turned-up cards and completed runs)
  moves: number
  elapsedMs: number
  hintsUsed: number
}
```

Saved only after the first move. Settings `solitaire:settings` / `spider:settings`
(*Only solvable deals*, *Tap moves automatically*, *Four-colour suits*, Solitaire: draw 1/3
is the variant, not a setting).

## 6. UI

- Lobby: continue, variants/difficulties (best time, games won), rules (first for new players).
- Play view: app bar with timer; HUD with moves and (Spider) completed runs; table;
  toolbar: Undo, Hint, Auto-finish (Solitaire, when possible), Restart same deal (confirm),
  New deal.
- Win: the remaining cards fly to the foundations one by one (reduced motion: instant), then
  the result dialog (time, moves, hints, new best) with New game · menu · Home.

## 7. Size budget

The shared card engine (≈ 15 kB gzip) and the two games (≈ 12 kB each) do not fit into the
current `total` budget of 280 kB (268 kB used). Raise it consciously to **350 kB** in
`scripts/check-dist.mjs` in the same pull request (reason: two card games). The `initial`
budget is not affected (games are lazily loaded; only their texts and home card art are in the
initial bundle).

## 8. Tests

- Engine: decks (52/104 unique cards), deterministic shuffle per seed, labels.
- Klondike rules: legal tableau/foundation moves, king to empty column, run moves, turning up,
  stock/waste incl. draw 3 and recycling, win, auto-finish, undo restores everything.
- Spider rules: suit-run moves, any-suit building, empty columns, deal blocked by an empty
  column, completed runs leave, win, undo across a completed run and a deal.
- Solvers: solutions replay legally to a win; solvable-deal generation per variant within the
  budget; hints follow one solution to a win.
- Components: tap smart move, drag & drop (pointer events), tap-select-tap, keyboard, live
  announcements, save after the first move, resume, win via hints.
- E2E: lobbies of both games in light and dark mode without accessibility violations (the
  game list in `e2e/app.spec.ts`).

## 9. Order of work

1. Card engine + `PlayingCard` + `CardTable` (drag, tap, keyboard, animation) with tests.
2. Solitaire (rules, solver, pool, UI), budget raise.
3. Spider on the same engine.
4. Docs (`docs/games/solitaire.md`, `docs/games/spider.md`), README, CHANGELOG.
