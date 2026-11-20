# Plan 08 – Enable, disable and reorder games

Players choose which games appear and in which order. The choice drives every place that
lists games: home screen, statistics, game sections in the settings.

## Model (`src/games/layout.ts`)

```ts
interface GameLayout { order: GameId[]; disabled: GameId[] }   // storage key: gameLayout:v1
```

- Normalised on load: unknown ids dropped, ids missing from `order` (new games added in an
  update) appended at the end **enabled**, duplicates removed.
- At least one game stays enabled (the last enabled toggle is disabled in the UI).
- `orderedGames` (all, in user order) and `visibleGames` (enabled only) are computed refs.
- Part of the normal backup export/import (it is a regular `riddles:*` key).
- Disabling a game only hides it; saved games and statistics are kept, and its routes keep
  working.

## UI (Settings → Games)

- One row per game: drag handle, game art, name, on/off switch.
- **Drag & drop** with pointer events on the handle (`touch-action: none`, pointer capture):
  the row follows the finger, the others move aside (FLIP animation via `TransitionGroup`),
  the order is saved on drop. Works with mouse and touch, no library.
- Keyboard / screen readers: the handle is a button; ↑/↓ move the game, announced via an
  `aria-live` message ("Crowns moved to position 2").
- The per-game settings sections below follow the same order and only show enabled games.

## Tests

Normalisation (new game appended, unknown removed, duplicates), at least one enabled,
reorder helpers, home/stats respecting order and visibility, keyboard reordering.
