# Plan 17 – Card games: Solitaire, Spider, FreeCell and TriPeaks

Four classic patience games on one shared card engine. Each is its own game on the home
screen (own lobby, statistics and settings):

| Game          | Genre           | In short                                                          |
| ------------- | --------------- | ----------------------------------------------------------------- |
| **Solitaire** | Klondike        | Build four foundations from ace to king; seven columns and a stock |
| **Spider**    | Spider          | Two decks, ten columns; complete runs king → ace in one suit       |
| **FreeCell**  | FreeCell        | All cards open, four free cells – nearly pure logic                |
| **TriPeaks**  | Tri Peaks       | Clear three peaks with cards one higher or lower – quick and light |

The rules are generic and centuries (TriPeaks: decades) old. Names, card design, animations,
scoring and deals are original; nothing is taken from commercial versions (no green felt
look, no copied card backs or face illustrations, no "bouncing cards" win animation, no
deal-number algorithm of other apps). Check the names *FreeCell* and *TriPeaks* for
trademarks before the release; fallbacks: *Free Cells* and *Peaks*.

All four offer **time or points** as scoring (§ 3). Solitaire additionally has **limited
passes** through the stock (§ 4).

## 1. Shared card engine

The conventions forbid imports between game folders, so the shared parts go to `core` and
`components`:

| Where                                  | What                                                           |
| -------------------------------------- | -------------------------------------------------------------- |
| `src/core/cards/cards.ts`              | `Card` (`suit` 0–3, `rank` 1–13, `faceUp`), decks (1 or 2), seeded shuffle, colour, labels |
| `src/core/cards/history.ts`            | undo stack of moves (compact, serialisable)                    |
| `src/core/cards/scoring.ts`            | point rules per game (§ 3), pure functions                     |
| `src/core/cards/solver.ts`             | generic depth-first search with transposition table and node budget; each game plugs in its moves and state key |
| `src/components/cards/PlayingCard.vue` | one card as SVG: rank and suit symbol, face-down back          |
| `src/components/cards/CardTable.vue`   | piles layout, fanning, drag & drop, tap-to-move, keyboard, move animations |

### Card design

- **Suit symbols as SVG paths**, not Unicode characters: on iOS ♥/♦ are often drawn as
  coloured emoji, and fonts differ.
- Large rank and suit in the top-left corner (readable when fanned), a big suit symbol in the
  middle. J, Q and K show the letter and suit only – no illustrations (original, and small).
- Back: an original geometric pattern in the game colour.
- Colours: red and black suits ≥ 4.5:1 on the card face in both themes; card edge ≥ 3:1
  against the table. Setting **Four-colour suits** (default off): ♣ green, ♦ blue – colour is
  never the only signal anyway (the suit symbol is always there).

### Layout (phone portrait first)

- Card width from the column count: Solitaire 7 columns ≈ 44 px at 360 px width, FreeCell
  8 columns ≈ 38 px, Spider 10 columns ≈ 31 px, TriPeaks bottom row of 10 overlapping cards ≈ 31 px –
  enough for corner rank + suit, tap targets ≥ 24 px (WCAG 2.5.8).
- Fanning: face-down cards overlap more (≈ 15 % of the card height) than face-up cards
  (≈ 28 %). A tall column compresses its overlap so it never leaves the screen.
- Landscape and tablets: larger cards, centred table.

### Input

| Action                    | Effect                                                                    |
| ------------------------- | ------------------------------------------------------------------------- |
| Tap a card                | **smart move**: to the foundation if possible, otherwise to the best legal pile (prefers uncovering a card, avoids empty columns for single cards); TriPeaks: onto the waste if it fits |
| Drag a card / a run       | drop on any legal pile; ghost preview, illegal drops snap back            |
| Tap, then tap a pile      | alternative to dragging (setting **Tap moves automatically** off → select first) |
| Tap the stock             | deal (Solitaire: draw 1 or 3; Spider: one card per column; TriPeaks: next card to the waste) |
| Keyboard                  | arrow keys move between piles/cards, Enter picks up / drops, Space smart move, D deals, U or Ctrl+Z undo |

Moves animate (≈ 180 ms, the card flies from its old to its new position); reduced motion →
instant. Drag uses pointer events with pointer capture, like Blocks.

### Accessibility

- Every pile is a list (`role="list"`), every reachable card a button with a label
  ("7 of hearts", "face-down card", "empty column 3", "stock: 12 cards, 2 passes left").
- Moves and point changes are announced in a polite live region ("7 of hearts to column 4,
  +5 points").
- Keyboard covers everything the pointer can do; focus stays on the moved card's pile.

## 2. Statistics: time and points

Today a game has *either* time or score statistics (`GameDescriptor.statKind`). The card
games record **both** in every finished game (`recordFinish({ timeMs, score })` already
accepts both):

- New value `statKind: 'both'` – the statistics view shows best/average time **and**
  best/average score for these games (small change in `StatsView.vue` and its tests).
- The **scoring setting** (§ 3) decides what the HUD and the result dialog show and which
  "new personal best" is celebrated.

## 3. Points instead of time

Setting per game **Scoring: Time / Points** (default *Time*). With *Points* the HUD shows
the score instead of the timer (the time still runs and is recorded), the result dialog leads
with the score, and the lobby shows the best score per variant.

Common rules:

- The score never goes below 0.
- **Undo** takes back the points of the move it undoes and costs **−2** (so undo is not free).
- A **hint** costs **−20**.
- Win bonus: **+500** plus a time bonus of **max(0, 900 − seconds)** points (fast games pay,
  slow ones still get the base bonus).

Per game:

| Game      | Points                                                                                   |
| --------- | ---------------------------------------------------------------------------------------- |
| Solitaire | +10 card to a foundation · +5 waste → column · +5 turning up a face-down card · −15 foundation → column · turning the stock over: −50 (draw 1) / −20 (draw 3), the first turn is free |
| Spider    | start 500 · −1 per move (deal included) · +100 per completed run                         |
| FreeCell  | +10 card to a foundation · −1 per move (moves to the foundation included)                 |
| TriPeaks  | streak scoring: the *n*-th card removed in a row (without drawing from the stock) gives *n* × 10 · +250 per cleared peak · +1000 for the third peak · +50 per stock card left at the win |

## 4. Solitaire (Klondike)

### Rules

- One deck. Tableau: 7 columns with 1–7 cards, the top card face up. Stock: the rest.
- Tableau: build down in **alternating colours**; any face-up run can move. An empty column
  only takes a king (or a run starting with a king). A face-down card turns up when it is
  uncovered.
- Foundations: one per suit, ace to king. Cards can also be moved back from a foundation.
- Stock: deal **1 or 3** cards to the waste; only the top waste card plays. When the stock is
  empty it is turned over again – as often as the **pass limit** allows (see below).
- Won when all 52 cards are on the foundations. **Auto-finish**: as soon as the stock and waste
  are empty and every card is face up, a button (and an automatic prompt) plays the rest.

### Variants (= statistics variants)

| Variant            | Draw | Passes through the stock | Note                              |
| ------------------ | ---- | ------------------------ | --------------------------------- |
| Draw 1             | 1    | unlimited                | easiest                           |
| Draw 1 · one pass  | 1    | **1** (no turning over)  | needs planning                    |
| Draw 3             | 3    | unlimited                | classic                           |
| Draw 3 · three passes | 3 | **3**                    | hardest                           |

The stock shows the passes left ("2 passes left"); with no pass left it shows an empty slot,
and a tap explains why nothing happens. The solver (§ 8) knows the pass limit, so
*Only solvable deals* (setting, default on) also holds for limited passes. The lobby
groups the four variants under Draw 1 / Draw 3.

## 5. Spider

### Rules

- Two decks (104 cards). Tableau: 10 columns, 6 cards in the first four, 5 in the others
  (54), top cards face up. Stock: 50 cards = 5 deals.
- Build down **regardless of suit**, but only a run of **one suit** can move together.
  Any card or run may go to an empty column.
- A complete run king → ace of one suit leaves the table automatically (8 runs to win).
- Dealing puts one card face up on every column – only allowed when no column is empty
  (classic rule).

### Difficulties

| Difficulty | Suits   | Note                                      |
| ---------- | ------- | ----------------------------------------- |
| Easy       | 1 (♠)   | almost every deal solvable                |
| Medium     | 2 (♠ ♥) |                                           |
| Hard       | 4       | the classic, needs planning               |

*Only solvable deals* (default on) applies to 1 and 2 suits (solver-checked). For 4 suits
the solver often needs too long on a phone; deals there are accepted if the solver finds a
solution within its budget, otherwise drawn again a few times and then accepted anyway –
the lobby says "4 suits: not every deal can be solved". No pass limit (Spider has no
recycling).

## 6. FreeCell

### Rules

- One deck, **all cards face up** in 8 columns (7, 7, 7, 7, 6, 6, 6, 6). Four **free cells**
  hold one card each; four foundations, ace to king by suit.
- Tableau: build down in alternating colours. Only single cards move by the rules; the game
  moves a run at once when there is room for it ("supermove"): at most
  (free cells + 1) × 2^(empty columns) cards, halved when the target is an empty column.
- Any card may go to an empty column or a free cell.
- **Safe automatic moves** to the foundations (setting, default on): a card moves up by
  itself when no card of the other colour could still need it (rank ≤ both opposite-colour
  foundations + 1).

### Variants (= difficulty)

| Variant        | Free cells | Note                                                       |
| -------------- | ---------- | ---------------------------------------------------------- |
| Classic        | 4          | nearly every deal solvable                                 |
| Three cells    | 3          | harder                                                     |
| Two cells      | 2          | hard; many random deals are unsolvable – solver-checked     |

*Only solvable deals* (default on) – the FreeCell solver is fast (all cards are known), so
every deal can be checked even with two cells. Deals are our own seeded shuffles (no deal
numbers of other apps). No stock, so no pass limit.

## 7. TriPeaks

### Rules

- One deck. **28 cards in three overlapping peaks** (rows of 3, 6, 9 and 10 cards); the bottom
  row is face up. A card turns up when both cards covering it are gone. The other 24 cards
  form the stock; one starts on the waste.
- Tap a face-up peak card that is **one rank higher or lower** than the top waste card: it
  becomes the new waste card. Ace and king connect (**wrap-around**, see variants).
- Tap the stock to turn the next card onto the waste when nothing fits (this ends the streak).
- Won when all 28 peak cards are cleared; lost when the stock is empty and no card fits
  (*Undo* still possible).

### Variants (= difficulty)

| Variant | Wrap-around K–A | Deals                       |
| ------- | --------------- | --------------------------- |
| Easy    | yes             | only solvable               |
| Medium  | no              | only solvable               |
| Hard    | no              | any deal (often unwinnable) |

The TriPeaks solver is a depth-first search over the known order of the stock – fast enough
to check every deal on Easy and Medium. Limited passes do not apply (the stock is used once,
by the rules of the game).

## 8. Solver and hints (`logic/`, in a worker)

- The generic solver in `core/cards/solver.ts`: depth-first search with a transposition table
  over canonical states, move ordering per game and a node budget (≈ 200 000). Returns a move
  list.
  - **Solitaire**: order – to foundation, uncover a face-down card, king to an empty column,
    from the waste, stock last; safe automatic foundation moves; the state includes the
    passes left.
  - **Spider**: same-suit runs first, then uncovering, then dealing; 1 and 2 suits within the
    budget, 4 suits best-effort.
  - **FreeCell**: safe automatic moves, supermoves as one move, free-cell moves last.
  - **TriPeaks**: longest streak first, stock last.
- **Hint** (−20 points in points mode): the next move of a solution from the current state
  (both piles highlighted, *Apply* plays it). Following hints walks along the same solution
  (as in Water Sort). If the solver finds none: a heuristic best move with "This may not lead
  to a win"; with no legal move at all: "No moves left – undo or deal".
- Deals are generated and checked in a worker behind a puzzle pool (`<game>:pool:v1`, one
  prefetched deal per variant), so "New game" is instant.

## 9. Persistence

```ts
interface CardSave {               // solitaire / spider / freecell / tripeaks :current:v1
  seed: number
  variant: string                  // e.g. 'draw3-3pass', 'suits2', 'cells3', 'easy'
  state: TableState                // piles of cards (rank, suit, faceUp) – compact arrays
  passesLeft?: number              // Solitaire with a pass limit
  history: Move[]                  // undo (incl. turned-up cards, completed runs, points)
  moves: number
  score: number
  streak?: number                  // TriPeaks
  elapsedMs: number
  hintsUsed: number
}
```

Saved only after the first move. Settings `<game>:settings`: *Scoring* (time/points), *Only
solvable deals*, *Tap moves automatically*, *Four-colour suits*, FreeCell: *Safe automatic
moves*. Draw count and pass limit are variants, not settings.

## 10. UI

- Lobby: continue, variants/difficulties (best time or best score – following the scoring
  setting – and games won), rules (first for new players).
- Play view: app bar with timer (time mode) or score (points mode); HUD with moves and
  game-specific values (Solitaire: passes left; Spider: completed runs; FreeCell: free cells
  used; TriPeaks: streak, stock left); table; toolbar: Undo, Hint, Auto-finish (Solitaire,
  FreeCell), Restart same deal (confirm), New deal.
- Points mode: a small "+10" floats up from the moved card (reduced motion: no float, the HUD
  value changes) and is announced in the live region.
- Win: the remaining cards fly to the foundations one by one (reduced motion: instant), then
  the result dialog (score with its parts – moves, bonus, time bonus –, time, moves, hints,
  new best) with New game · menu · Home. TriPeaks loss: dialog with Undo · Try again · New deal.

## 11. Size budget

The shared engine (≈ 15 kB gzip) and four games (≈ 10–12 kB each) need ≈ 60 kB; the current
`total` budget is 280 kB (268 kB used). Raise it consciously to **360 kB** in
`scripts/check-dist.mjs` in the first card-game pull request (reason: four card games on a
shared engine). The `initial` budget (100 kB, 84 kB used) grows only by the texts and home
card art of the four games (≈ 6 kB).

## 12. Tests

- Engine: decks (52/104 unique cards), deterministic shuffle per seed, labels; generic solver
  on a toy game.
- Scoring: every rule per game, undo restores points and costs −2, hint −20, never below 0,
  win and time bonus.
- Solitaire: legal tableau/foundation moves, king to empty column, run moves, turning up,
  draw 3, recycling with and without pass limit (no recycling after the last pass), win,
  auto-finish, undo restores everything incl. passes.
- Spider: suit-run moves, any-suit building, empty columns, deal blocked by an empty column,
  completed runs leave, win, undo across a completed run and a deal.
- FreeCell: free cells, supermove limits (incl. empty-column target), safe automatic moves,
  win.
- TriPeaks: covering and turning up, ±1 with and without wrap-around, streaks and peak
  bonuses, stock, win and loss.
- Solvers: solutions replay legally to a win; solvable-deal generation per variant within the
  budget (incl. limited passes and two free cells); hints follow one solution to a win.
- Statistics: `statKind: 'both'` shows time and score.
- Components: tap smart move, drag & drop (pointer events), tap-select-tap, keyboard, live
  announcements, points mode HUD, save after the first move, resume, win via hints.
- E2E: lobbies of all four games in light and dark mode without accessibility violations
  (the game list in `e2e/app.spec.ts`).

## 13. Order of work

1. Card engine, scoring, generic solver, `PlayingCard`, `CardTable` (drag, tap, keyboard,
   animation) with tests; `statKind: 'both'`; budget raise.
2. Solitaire incl. pass limits and points.
3. FreeCell (reuses most of Solitaire's table, fast solver).
4. Spider.
5. TriPeaks (different table layout: peaks instead of columns).
6. Docs (`docs/games/<game>.md` for all four), README, CHANGELOG.
