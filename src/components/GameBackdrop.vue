<script setup lang="ts">
import { computed } from 'vue'

import { useGameAccent } from '@/core/gameAccent'
import type { GameId } from '@/games/types'

/**
 * Page background in a game's colour with a motif that fits the game (a grid for Sudoku,
 * felt for the card games, bubbles for Water Sort, …). Used by the lobby (via LobbyHero) and
 * by the play view, so both share one look.
 *
 * Put it as the **first child of the page's `<main>`**: it is fixed to the viewport and sits
 * behind the main's content (base.css gives such a main its own stacking context).
 */
const props = defineProps<{ game: GameId }>()

useGameAccent(() => props.game)

/** Card games share one felt table look. */
const CARD_GAMES = new Set<string>(['solitaire', 'spider', 'freecell', 'tripeaks'])
const theme = computed(() => (CARD_GAMES.has(props.game) ? 'cards' : props.game))
</script>

<template>
  <div class="game-backdrop" :data-theme-game="theme" :style="{ '--hero': `var(--game-${game})` }" aria-hidden="true" />
</template>

<style scoped>
/* --- Page background in the game's colour, with a fitting motif ---------------------- */

.game-backdrop {
  --tint: color-mix(in srgb, var(--hero) 16%, var(--color-bg));
  --ink: color-mix(in srgb, var(--hero) 12%, transparent);

  position: fixed;
  inset: 0;
  /* Inside the main's stacking context (base.css): behind all of its content. */
  z-index: -1;
  pointer-events: none;
  background-color: var(--color-bg);
  background-image: linear-gradient(180deg, var(--tint), var(--color-bg) 75%);
}

.game-backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  -webkit-mask: linear-gradient(180deg, #000, transparent 85%);
  mask: linear-gradient(180deg, #000, transparent 85%);
}

/* Sudoku, Nonogram, Blocks, Merge: a grid. */
.game-backdrop[data-theme-game='sudoku']::after,
.game-backdrop[data-theme-game='nonogram']::after,
.game-backdrop[data-theme-game='blocks']::after,
.game-backdrop[data-theme-game='merge']::after {
  background:
    linear-gradient(var(--ink) 1.5px, transparent 1.5px) 0 0 / 28px 28px,
    linear-gradient(90deg, var(--ink) 1.5px, transparent 1.5px) 0 0 / 28px 28px;
}

/* Stars, Links, Code Breaker: dots. */
.game-backdrop[data-theme-game='crowns']::after,
.game-backdrop[data-theme-game='links']::after,
.game-backdrop[data-theme-game='codebreaker']::after {
  background: radial-gradient(circle, var(--ink) 3px, transparent 3.5px) 0 0 / 26px 26px;
}

/* Arrows: diagonal stripes. */
.game-backdrop[data-theme-game='arrows']::after {
  background: repeating-linear-gradient(-45deg, var(--ink) 0 6px, transparent 6px 22px);
}

/* Mines: a mown meadow. */
.game-backdrop[data-theme-game='mines']::after {
  background: repeating-conic-gradient(var(--ink) 0 25%, transparent 0 50%) 0 0 / 40px 40px;
}

/* Pipes: pipe runs. */
.game-backdrop[data-theme-game='pipes']::after {
  background:
    linear-gradient(transparent 44%, var(--ink) 44% 56%, transparent 56%) 0 0 / 60px 60px,
    linear-gradient(90deg, transparent 44%, var(--ink) 44% 56%, transparent 56%) 30px 30px / 60px 60px;
}

/* Snake: a winding track of scales. */
.game-backdrop[data-theme-game='snake']::after {
  background:
    radial-gradient(circle at 50% 100%, transparent 9px, var(--ink) 9.5px 11px, transparent 11.5px) 0 0 / 24px 12px,
    radial-gradient(circle at 50% 100%, transparent 9px, var(--ink) 9.5px 11px, transparent 11.5px) 12px 6px / 24px 12px;
}

/* Bubbles: a honeycomb of bubble rings, as in the field. */
.game-backdrop[data-theme-game='bubbles']::after {
  background:
    radial-gradient(circle, transparent 8px, var(--ink) 8.5px 10px, transparent 10.5px) 0 0 / 24px 41.6px,
    radial-gradient(circle, transparent 8px, var(--ink) 8.5px 10px, transparent 10.5px) 12px 20.8px / 24px 41.6px;
}

/* Water Sort: rising bubbles. */
.game-backdrop[data-theme-game='watersort']::after {
  background:
    radial-gradient(circle, transparent 5px, var(--ink) 5.5px 7px, transparent 7.5px) 0 0 / 70px 90px,
    radial-gradient(circle, transparent 2.5px, var(--ink) 3px 4px, transparent 4.5px) 35px 45px / 70px 90px,
    radial-gradient(circle, var(--ink) 2px, transparent 2.5px) 15px 70px / 70px 90px;
}

/* Card games: a green felt table. */
.game-backdrop[data-theme-game='cards'] {
  --tint: color-mix(in srgb, #1f7a46 30%, var(--color-bg));
  --ink: rgb(20 90 50 / 12%);
}

.game-backdrop[data-theme-game='cards']::after {
  background:
    radial-gradient(circle at 25% 25%, var(--ink) 1px, transparent 1.5px) 0 0 / 6px 6px,
    radial-gradient(circle at 75% 75%, var(--ink) 1px, transparent 1.5px) 0 0 / 7px 7px;
}
</style>
