# 19 – Shared puzzles (seed links) – evaluation & plan

**Status:** evaluated, not started. Builds on the result sharing that shipped with this
plan's evaluation (win dialog → "Share result" → challenge link into the lobby).

## Goal

Let players send a friend **the exact same puzzle** (or the same deal / the same piece
sequence) and compare results – without a backend, account or tracking. A link reproduces
the game on the friend's device; the friend's result can be shared back the same way.

## What exists today

| Building block | State |
| --- | --- |
| Result sharing | **Done.** Win dialog → *Share result* → `#/<game>?challenge=<variant>&result=…&kind=…`. The lobby shows a challenge note and marks the variant; it never starts a game by itself. |
| Seeded RNG | `core/rng.ts` (mulberry32). All generators take an `Rng`; a seed always produces the same puzzle **with the current generator code**. |
| Seeds stored | Puzzle games store `puzzle.seed` (Sudoku, Stars, Links, Nonogram, Arrows, Mines, Pipes, Water Sort, Code Breaker). Card games store the deal `seed`. Merge, Blocks and Shapes start runs from a seed (`newRun(seed)` / `createRun(mode, seed)`) and keep an `rngState`. |
| Pools | Slow generators pre-generate puzzles in a worker (`core/pool.ts`); pooled puzzles carry their seed. |
| PWA links | Hash routing (`#/…`), in-scope links; manifest has `handle_links: preferred` and `launch_handler` so supporting browsers open links in the installed app. |

## Findings per game

| Game | Reproducible from a seed? | Notes |
| --- | --- | --- |
| Sudoku (9×9, 6×6) | yes | Expert generation is slow → needs the worker + loading overlay, not the pool. |
| Stars, Links, Nonogram | yes | Same: generate in the worker on demand. |
| Arrows, Mines, Pipes, Water Sort, Code Breaker | yes | Fast enough on the main thread or in their workers. Mines' pre-opened start is part of the puzzle, so it is identical. |
| Solitaire, Spider, FreeCell, TriPeaks | yes | `deal(variant, solvable)` may retry for a solvable deal – the **final** seed must be shared, plus the `solvable` flag is irrelevant once the seed is fixed. |
| Merge, Blocks | partly | Same start and same RNG; the spawned tiles / pieces depend on the RNG sequence, which is consumed identically **only if every move draws the same number of random values**. To be checked per engine; otherwise derive spawns from `(seed, move number)`. |
| Shapes (Zen / Time) | partly | Refills consume the RNG depending on how many pieces were cleared → games diverge after the first different move. Acceptable for "same start", or switch refills to a per-column sequence derived from the seed. |
| Shapes (Levels) | already fixed | Levels use a fixed seed per level (`def.seed`); sharing "level 23" already means the same board. |

## The main risk: generator changes

A seed only reproduces a puzzle while the generator code stays the same. Any change to a
generator (bug fix, new technique, tuning) silently turns old links into different puzzles.

**Mitigation**

- A **generator version** per game (`GENERATOR_VERSION` in each `logic/generator.ts`),
  included in the link: `…&gv=3`.
- **Golden tests** per game: a few fixed seeds → hash of the generated puzzle. A failing
  golden test forces a conscious version bump.
- A link with an unknown/old version opens the lobby with a note ("this puzzle was made
  with an older version") and offers a new puzzle of the same difficulty instead.

## Link format

```text
https://…/riddles/#/<game>/play?seed=<base36>&v=<variant>&gv=<version>
                                &result=<formatted>&kind=time|score   (optional, the sender's result)
```

- `seed` base36 (≤ 7 characters for 32 bit), `v` the statistics variant (`hard`, `mini-easy`,
  `draw3`, `4x4`, …).
- Never auto-starts over a running game: if a save exists, the play view first asks
  ("Replace your running game?") – same rule as the lobby today.
- The sender's result is display-only and validated like today (`parseChallenge`).

## UX

- **Win dialog:** two actions – *Share result* (today: same difficulty, new puzzle) and
  *Challenge with this puzzle* (seed link). On card games: *Share this deal*.
- **Receiving:** "A friend solved **this puzzle** in 4:12 – can you beat it?" with *Play*;
  the play view shows a small "shared puzzle" chip and the friend's result next to the timer.
- **After solving a shared puzzle:** the result dialog compares ("You: 3:58 · Friend: 4:12")
  and offers to share back (same seed, own result).
- **Statistics:** shared puzzles count normally (they are real games); pools are not touched.

## Optional follow-ups

- **Daily puzzle:** seed derived from the date (`YYYYMMDD` + game) – everyone gets the same
  puzzle per day, no backend. Needs the same versioning.
- **Comparing more than time:** moves, mistakes, hints used (already recorded) as part of the
  result in the link.
- **QR code** in the share dialog for playing side by side.

## Non-goals / limits

- No leaderboard, no server, no accounts – results are whatever the sender put in the link
  (no cheat protection; the link is a friendly challenge).
- iOS does not open links in an installed web app (no link capturing for home-screen apps):
  links open in Safari. Android/Chromium installs open them in the app.

## Work packages

1. `GENERATOR_VERSION` + golden tests for every game (seed → hash) – **prerequisite**.
2. Play-view entry `?seed=&v=&gv=` for the puzzle games (generate on demand in the worker,
   confirm before replacing a running game, version check).
3. Card games: share the final deal seed; same entry.
4. Win dialog: *Challenge with this puzzle*; result comparison when playing a shared puzzle.
5. Merge / Blocks / Shapes: decide "same start" vs. deterministic spawns per move; implement.
6. Docs (`docs/games/*.md` link section, privacy note: links contain only game data) and
   tests (link round trip per game, version mismatch, running-game confirmation).

## Open questions for the owner

1. Should shared puzzles also be possible for the score games (Merge, Blocks, Shapes), or
   only for the logic puzzles and card games?
2. Daily puzzle: wanted as part of this or later?
3. What should a version-mismatch link do: offer a new puzzle of the same difficulty (as
   proposed) or try the old generator if it is kept around?
