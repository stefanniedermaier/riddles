# Card games – shared engine

Solitaire, Spider, FreeCell and TriPeaks share one engine (plan:
[plan/17-card-games.md](../../plan/17-card-games.md)). Game folders may not import each other,
so the shared parts live in `core` and `components`:

| Where                                    | What                                                         |
| ---------------------------------------- | ------------------------------------------------------------ |
| `src/core/cards/cards.ts`                | `CardDef` (suit, rank), decks, seeded shuffle, **slots**: card id face up, `-id - 1` face down |
| `src/core/cards/game.ts`                 | `CardRules` contract (`deal`, `apply`, `isWon`, `solverMoves`, `key`, `isMove`), `replay`, points constants |
| `src/core/cards/solver.ts`               | generic depth-first search with transposition table and node budget |
| `src/core/cards/worker.ts`               | worker requests: solvable deal, solution from the current position |
| `src/components/cards/PlayingCard.vue`   | one card as SVG (suit symbols as paths, no face illustrations) |
| `src/components/cards/CardTable.vue`     | layout, fanning, drag & drop, tap, keyboard, move animation  |
| `src/components/cards/CardGameView.vue`  | the play view of all four games                              |
| `src/components/cards/CardGameLobby.vue`, `CardGameSettings.vue` | lobby and settings panel                     |

Each game folder holds its rules (`logic/rules.ts`), the worker handler, `game.ts` (a
`CardGameDef`: layout, tap/drop moves, HUD, texts, deal pool, settings) and thin wrapper
components.

## Saving and undo

A running game is stored as **seed, variant and move list** (`<game>:current:v1`); the state is
rebuilt by replaying the moves. `marks` remember where each player action ended, so *Undo*
takes back one action including the automatic moves after it. Saved after the first action.

## Time or points

Setting *Scoring* per game (default *Time*). Points mode shows the score instead of the timer.
Common rules: undo −2, hint −20, the score never goes below 0, a win adds +500 and a time bonus
of max(0, 900 − seconds). Game-specific points are in each game's doc. Statistics always
record both (`statKind: 'both'`); the statistics page shows best time and high score.

## Input and accessibility

| Action                | Effect                                                                  |
| --------------------- | ----------------------------------------------------------------------- |
| Tap a card            | smart move (foundation, best column, free cell …)                       |
| Drag a card or run    | drop on any pile; illegal drops snap back                               |
| Tap, then tap a pile  | with *Tap moves automatically* off                                      |
| Tap the stock         | deal                                                                    |
| Keyboard              | one tab stop; arrow keys move between piles and cards, Enter/Space taps, U undo, D deal, Ctrl+Z undo |

Every card and empty pile is a button with a label ("Column 3: 7 of hearts"); face-down cards are
hidden from screen readers. Moves are announced in a live region. Card faces are white in both
themes; suits ≥ 4.5:1, card edges ≥ 3:1 against the table. *Four-colour suits* (clubs green,
diamonds blue) is optional – the suit symbol is always there.

## Solver and hints

Deals are generated in a worker behind a puzzle pool (`<game>:pool:v1`). With *Only solvable
deals* (default on) a deal is only used if the solver finishes it within its budget; the worker
tries up to 30–40 deals. *Hint* asks the worker for a solution from the current position and
shows its first move; following hints walks along that solution. Without a solution the best
heuristic move is shown with "This may not lead to a win".

Measured (Node, 25–30 deals, budget 60 000–100 000 nodes):

| Game / variant          | Solved within budget | Avg. time per deal |
| ----------------------- | -------------------- | ------------------ |
| Solitaire draw 1        | 72 %                 | ≈ 0.5 s            |
| Solitaire draw 1 · one pass | 0 % (40 % proven unsolvable) | ≈ 1 s  |
| Solitaire draw 3        | 64 %                 | ≈ 0.6 s            |
| Solitaire draw 3 · three passes | 24 %         | ≈ 0.8 s            |
| FreeCell 4 / 3 / 2 cells | 90 % / 80 % / 55 %  | ≈ 0.3 s            |
| Spider 1 / 2 / 4 suits  | 100 % / 63 % / 13 %  | 0.01 / 0.7 / 1.4 s |
| TriPeaks easy / medium  | 97 % / 67 %          | < 0.1 s            |

Spider with 4 suits accepts a deal after 4 attempts even without a proof, and Solitaire *draw 1
· one pass* is not checked at all – it is almost never winnable (the rules say so in both games).
