# Water Sort

A colour sorting puzzle (plan: [plan/15-water-sort.md](../../plan/15-water-sort.md)). Pour water
from tube to tube until every tube holds one colour. Name, artwork and levels are original;
every level is generated on the device.

## Rules

- Every tube holds up to 4 layers. *n* colours with 4 layers each fill *n* tubes; 2 tubes start empty.
- Tap a tube to pick it up, tap another tube to pour. The top run of equal layers moves over –
  as much as fits – but only onto the same colour or into an empty tube.
- Tapping a tube that cannot take the water picks it up instead (if it can be poured from),
  otherwise it shakes.
- Solved when every tube is empty or full with one colour.

## Controls

| Action   | Effect                                                                         |
| -------- | ------------------------------------------------------------------------------ |
| Tap      | pick up / pour / put down (tapping the picked-up tube again)                    |
| Keyboard | tubes are buttons: Tab moves, Enter / Space taps                                |
| Undo (↶ / Ctrl+Z) | pours the last move back (unlimited, counts as a move)                |
| Hint     | shows the next move of a solution (both tubes highlighted), *Apply* pours. Following hints walks along one solution, so hints always lead to the goal. From a dead end: "undo some moves". |
| Restart  | the same level from the start (confirmation)                                    |

Setting (Settings → Water Sort): **Show symbols** (on) – a letter on every layer, so colours
never have to be told apart by hue alone (WCAG 1.4.1); can be turned off.

## Difficulties

| Difficulty | Colours | Tubes | Solution length (solver, 15 seeds) |
| ---------- | ------- | ----- | ---------------------------------- |
| Easy       | 4       | 6     | 11–19 moves                        |
| Medium     | 6       | 8     | 20–29                              |
| Hard       | 9       | 11    | 31–42                              |
| Expert     | 12      | 14    | 39–51                              |

Tubes are laid out in up to two balanced rows (max. 7 per row).

## Generator & solver (`logic/`)

- **Generator**: shuffle 4 × *n* layers into *n* tubes, add 2 empty tubes; reject levels with a
  sorted tube or three equal layers on top of each other; keep the level only if the solver
  solves it. Deterministic per seed, a few milliseconds even for Expert – no worker or pool.
- **Solver**: depth-first search over canonical states (tube order ignored) with move ordering
  (completing a tube first) and pruning (one-colour tube into an empty tube, more than one
  empty target). Node budget 150 000.

## Storage

| Key                     | Content                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `watersort:current:v1`  | level, tubes, move history, moves, time, hints – saved after the first action |
| `watersort:settings`    | *Show symbols*                                                  |
