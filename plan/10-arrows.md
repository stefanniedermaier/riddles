# Plan 10 – Arrows

An ordering puzzle: the board is filled with arrows. Tapping an arrow lets it slide out of
the board in the direction of its head – but only if nothing blocks the way. Find an order
that clears the whole board. Generic mechanic; name, artwork and levels are original and
generated.

## 1. Rules

- Every arrow is a path of 1–6 orthogonally connected cells (straight or bent) with a head
  at one end; the head points in the direction of its last segment (or a given direction
  for one-cell arrows).
- Tapping an arrow: if every cell on the straight line from the head to the board edge is
  free, the arrow slides out (the body follows the head) and is removed.
- Otherwise the arrow bumps against the first blocking arrow: both flash and the player
  loses **one life** (3 lives per puzzle). With 0 lives the puzzle is failed → *Try again*
  (same puzzle) or *New puzzle*.
- The puzzle is solved when the board is empty.

## 2. Difficulty → size

| Difficulty | Board  | Arrows (approx.) | Max. dependency depth |
| ---------- | ------ | ---------------- | --------------------- |
| Easy       | 6×6    | 8–12             | 3–4                   |
| Medium     | 8×8    | 14–20            | 5–6                   |
| Hard       | 10×10  | 22–30            | 7–9                   |
| Expert     | 12×12  | 30–42            | 9+                    |

*Dependency depth* = length of the longest chain "A can only leave after B left".

## 3. Generator (always solvable by construction)

Build the board in **reverse removal order**: repeatedly place a new arrow whose exit ray
(head → edge) does not cross any arrow placed before it. Removing the arrows in reverse
placement order is then always possible. Arrow bodies grow as random walks over free cells
(1–6 cells, preferring bends for variety); heads are chosen so the exit ray is free. Fill
until the target coverage (≈ 85–100 % of cells) is reached; retry when the dependency depth
is outside the difficulty window. Deterministic per seed, runs in a worker with a prefetch
pool.

A solver/analyser computes for each arrow the arrows blocking it (first arrow on its ray)
and the dependency depth (for grading, hints and tests).

## 4. UI

- Lobby (`#/arrows`): continue, difficulty list (size, best time); rules first for new
  players, below the list afterwards.
- Board: grid with subtle dots; arrows drawn as thick rounded SVG polylines with an
  arrowhead, colour-coded by direction (4 colours, also distinguishable by the head shape),
  light and dark theme.
- Tap → slide-out animation along the ray (~200–300 ms, reduced motion → instant fade);
  blocked → short bump animation + both arrows flash in the error colour + heart lost.
- HUD: lives (♥♥♥), arrows left, timer. Toolbar: Hint (highlights one arrow that can leave
  now; counts as hint), Restart (confirm).
- No undo (lives would become meaningless).
- Win → result dialog (time, lives left, hints, new best) with New game · Arrows menu · Home.
- Fit 360×640: 12×12 ≈ 28 px cells; hit testing via `data-cell` + elementFromPoint, the
  whole cell area of an arrow is tappable.

## 5. Persistence & stats

`arrows:current:v1` (puzzle, removed arrow ids, lives, elapsed time, hints) – saved only
after the first action; `arrows:pool:v1`; `recordStart`/`recordFinish({ timeMs })` per
difficulty (failed puzzles count as started, not finished).

## 6. Tests

Generator per difficulty and seeds: arrows don't overlap, cover the target share, reverse
order removes everything (solvable), depth in window, deterministic. Rules: free/blocked
detection incl. bent arrows and rays crossing bodies, lives, failure, completion. Hints
always point to a removable arrow. Component tests: tap to remove, blocked tap costs a life,
solve via hints to the result dialog, save only after first action.
