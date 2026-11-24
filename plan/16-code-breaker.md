# Plan 16 – Code Breaker

A deduction game (genre *code breaking* / *bulls and cows*): find the hidden colour code.
After every guess you learn how many pegs are right in colour **and** position, and how many
are the right colour in the wrong position. Name and artwork are original.

## 1. Rules

- The code has *L* positions, each one of *K* colours.
- A guess must be complete. Feedback per guess (shown as small dots, order does not reveal
  positions):
  - **filled dot** – a peg with the right colour in the right position,
  - **ring** – a peg with a right colour in a wrong position (each code peg counts at most once).
- Solved when a guess has *L* filled dots. With no guesses left the round is lost and the
  code is shown.

## 2. Difficulty

| Difficulty | Positions | Colours | Repeats | Guesses |
| ---------- | --------- | ------- | ------- | ------- |
| Easy       | 4         | 6       | no      | 10      |
| Medium     | 4         | 6       | yes     | 10      |
| Hard       | 5         | 7       | yes     | 10      |
| Expert     | 6         | 8       | yes     | 12      |

Every code can be found within the guess limit by a consistent strategy (each guess
compatible with all feedback so far needs ≤ 7 guesses for 4/6 and stays well below the
limit for the larger sizes in simulations – covered by a test).

## 3. Logic (`logic/`)

- `score(code, guess)` → `{ exact, partial }`.
- `consistent(history, candidate)`: a code that would have produced every feedback so far.
- **Possible codes** (counted, not listed): for Easy–Hard by enumeration (≤ 7⁵ = 16 807), for
  Expert (8⁶ = 262 144) also enumeration in chunks – fast enough (< 50 ms).
- **Hint**: fills the current guess with a random code that is consistent with all feedback
  so far (the player still has to submit it). Counts as a hint. With setting *Check guesses*
  (default off) a guess that contradicts earlier feedback is marked before it is submitted.
- Code generation: seeded random code (no repeats on Easy). No worker or pool needed.

## 4. UI

- Lobby (`#/codebreaker`): continue, difficulty list (positions × colours), rules.
- Board: one row per guess (oldest at the top), feedback dots on the right; the current row
  has empty slots. Hidden code row at the top (revealed on win/loss).
- Input: colour palette at the bottom (≥ 44 px buttons); a tap fills the selected slot (the
  next empty one by default); tapping a slot selects it, tapping a filled slot twice clears it.
  Buttons: Clear, **Guess** (enabled when complete).
- Pegs carry a symbol per colour (shape) so colours never have to be told apart by hue alone.
- HUD: difficulty, guesses left, possible codes (setting *Show possible codes*, default off).
- Keyboard: 1–8 pick colours, Backspace clears the last peg, Enter submits.
- Win → result dialog (time, guesses, hints, new best); loss → dialog with the code,
  *Try a new code* and Home.

## 5. Statistics & storage

Variants = difficulties, `statKind: 'time'`; a lost round counts as started, not finished.
Keys `codebreaker:current:v1` (after the first guess), settings `codebreaker:settings`.

## 6. Tests

Scoring (repeats, no double counting), consistency, possible-code count, a consistent strategy
solves random codes within the limit for every difficulty, hint guesses are consistent, no
repeats on Easy, deterministic per seed. Component tests: fill and submit a guess, feedback
shown, win and loss dialogs, save after the first guess.
