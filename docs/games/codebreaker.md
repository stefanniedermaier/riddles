# Code Breaker

A deduction game (plan: [plan/16-code-breaker.md](../../plan/16-code-breaker.md), genre *code
breaking*). Find the hidden colour code; every guess tells you how close you are. Name and
artwork are original.

## Rules

- The code has 4–6 positions with 6–8 colours. Every colour has its own shape, so colours never
  have to be told apart by hue alone.
- Feedback per guess (dots, in no particular order): **filled dot** = right colour in the right
  position, **ring** = right colour in a wrong position (each code peg counts at most once).
- Solved with all dots filled; with no guesses left the round is lost and the code is shown.

## Controls

| Action           | Effect                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| Tap a colour     | fills the selected slot, then the next empty one                         |
| Tap a slot       | selects it; tapping a selected filled slot clears it                     |
| Clear            | empties the current row                                                  |
| Guess            | submits a complete row (on Easy each colour only once)                   |
| Hint             | fills the row with a code that fits every clue so far (still to be submitted) |
| New code         | gives up and starts a new code (confirmation)                            |
| Keyboard         | 1–8 colours, Backspace clears the last peg, Enter guesses                |

Settings (Settings → Code Breaker): **Check guesses** (off) – a complete row that contradicts
earlier clues is marked; **Show possible codes** (off) – how many codes still fit.

## Difficulties

| Difficulty | Positions | Colours | Repeats | Guesses |
| ---------- | --------- | ------- | ------- | ------- |
| Easy       | 4         | 6       | no      | 10      |
| Medium     | 4         | 6       | yes     | 10      |
| Hard       | 5         | 7       | yes     | 10      |
| Expert     | 6         | 8       | yes     | 12      |

A test plays random codes with a strategy that always guesses a code consistent with all clues
so far: it finds every code within the limit on every difficulty.

## Logic (`logic/logic.ts`)

`score` (exact / partial), `isConsistent`, `possibleCodes` (enumeration, ≤ 8⁶ = 262 144 codes)
and `consistentGuess` (search from a random starting point). Codes are generated from a seed;
no worker or pool.

## Storage

| Key                       | Content                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `codebreaker:current:v1`  | code, guesses, current row, time, hints – saved after the first action |
| `codebreaker:settings`    | the two settings above                                      |

Statistics per difficulty (time); a lost round counts as started, not finished.
