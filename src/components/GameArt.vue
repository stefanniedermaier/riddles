<script setup lang="ts">
import type { GameId } from '@/games/types'

/** Small original illustrations for the home screen cards. */
defineProps<{ game: GameId }>()
</script>

<template>
  <svg class="game-art" viewBox="0 0 64 64" aria-hidden="true">
    <template v-if="game === 'sudoku'">
      <rect x="4" y="4" width="56" height="56" rx="10" fill="var(--color-surface)" />
      <g stroke="var(--game-sudoku)" stroke-width="1.5" opacity=".35">
        <path d="M22.7 8v48M41.3 8v48M8 22.7h48M8 41.3h48" />
      </g>
      <g fill="var(--game-sudoku)" font-family="var(--font-sans)" font-weight="700" font-size="13" text-anchor="middle">
        <text x="15.3" y="20">5</text>
        <text x="32" y="38.5">3</text>
        <text x="48.7" y="57" opacity=".55">9</text>
        <text x="48.7" y="20" opacity=".55">1</text>
        <text x="15.3" y="57">7</text>
      </g>
    </template>
    <template v-else-if="game === 'crowns'">
      <rect x="4" y="4" width="56" height="56" rx="10" fill="var(--color-surface)" />
      <rect x="8" y="8" width="24" height="24" rx="4" fill="#eb4773" />
      <rect x="32" y="8" width="24" height="24" rx="4" fill="#47c2eb" />
      <rect x="8" y="32" width="24" height="24" rx="4" fill="#47eb5d" />
      <rect x="32" y="32" width="24" height="24" rx="4" fill="#f0b642" />
      <g fill="#1d1b26" stroke="#fff" stroke-width="1.4" stroke-linejoin="round" paint-order="stroke">
        <path d="M44.0 11.5 L46.4 17.8 L53.0 18.1 L47.8 22.2 L49.6 28.7 L44.0 25.0 L38.4 28.7 L40.2 22.2 L35.0 18.1 L41.6 17.8Z" />
        <path d="M20.0 35.5 L22.4 41.8 L29.0 42.1 L23.8 46.2 L25.6 52.7 L20.0 49.0 L14.4 52.7 L16.2 46.2 L11.0 42.1 L17.6 41.8Z" />
      </g>
    </template>
    <template v-else-if="game === 'links'">
      <rect x="4" y="4" width="56" height="56" rx="10" fill="var(--color-surface)" />
      <g fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 15h34v12" stroke="#e2445c" />
        <path d="M15 27v22h20" stroke="#3a72d6" />
        <path d="M27 39h22" stroke="#2f9e6e" opacity=".9" />
      </g>
      <g>
        <circle cx="15" cy="15" r="5.5" fill="#e2445c" />
        <circle cx="49" cy="27" r="5.5" fill="#e2445c" />
        <circle cx="15" cy="27" r="5.5" fill="#3a72d6" />
        <circle cx="35" cy="49" r="5.5" fill="#3a72d6" />
        <circle cx="27" cy="39" r="5.5" fill="#2f9e6e" />
        <circle cx="49" cy="39" r="5.5" fill="#2f9e6e" />
      </g>
    </template>
    <template v-else-if="game === 'nonogram'">
      <rect x="4" y="4" width="56" height="56" rx="10" fill="var(--color-surface)" />
      <g fill="var(--game-nonogram)" font-family="var(--font-sans)" font-weight="700" font-size="7" text-anchor="middle" opacity=".75">
        <text x="12" y="31">2</text>
        <text x="12" y="41">4</text>
        <text x="12" y="51">1 1</text>
        <text x="27" y="17">3</text>
        <text x="37" y="17">2</text>
        <text x="47" y="17">2</text>
      </g>
      <g fill="var(--game-nonogram)">
        <rect x="23" y="24" width="9" height="9" rx="1.5" />
        <rect x="33" y="24" width="9" height="9" rx="1.5" />
        <rect x="23" y="34" width="9" height="9" rx="1.5" />
        <rect x="33" y="34" width="9" height="9" rx="1.5" />
        <rect x="43" y="34" width="9" height="9" rx="1.5" />
        <rect x="23" y="44" width="9" height="9" rx="1.5" />
        <rect x="43" y="44" width="9" height="9" rx="1.5" />
      </g>
      <rect x="43" y="24" width="9" height="9" rx="1.5" fill="none" stroke="var(--game-nonogram)" stroke-opacity=".35" />
      <rect x="33" y="44" width="9" height="9" rx="1.5" fill="none" stroke="var(--game-nonogram)" stroke-opacity=".35" />
    </template>
    <template v-else-if="game === 'merge'">
      <rect x="4" y="4" width="56" height="56" rx="10" fill="var(--color-surface)" />
      <g font-family="var(--font-sans)" font-weight="800" text-anchor="middle">
        <rect x="9" y="9" width="21" height="21" rx="5" fill="var(--game-merge)" opacity=".25" />
        <text x="19.5" y="24" font-size="11" fill="var(--game-merge)">2</text>
        <rect x="34" y="9" width="21" height="21" rx="5" fill="var(--game-merge)" opacity=".45" />
        <text x="44.5" y="24" font-size="11" fill="var(--color-surface)">4</text>
        <rect x="9" y="34" width="21" height="21" rx="5" fill="var(--game-merge)" opacity=".7" />
        <text x="19.5" y="49" font-size="10" fill="var(--color-surface)">16</text>
        <rect x="34" y="34" width="21" height="21" rx="5" fill="var(--game-merge)" />
        <text x="44.5" y="48.5" font-size="8" fill="var(--color-surface)">128</text>
      </g>
    </template>
    <template v-else-if="game === 'arrows'">
      <rect x="4" y="4" width="56" height="56" rx="10" fill="var(--color-surface)" />
      <!-- Four arrows on a grid that never cross: one colour, like on the board. -->
      <g fill="none" stroke="var(--game-arrows)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 14h22" />
        <path d="M50 48V20" />
        <path d="M14 26v24h16" />
        <path d="M40 34H28" />
      </g>
      <g fill="var(--game-arrows)" stroke="var(--game-arrows)" stroke-width="1.5" stroke-linejoin="round">
        <path d="M33 8.5l7.5 5.5-7.5 5.5z" />
        <path d="M44.5 21l5.5-7.5 5.5 7.5z" />
        <path d="M29 44.5l7.5 5.5-7.5 5.5z" />
        <path d="M29 28.5l-7.5 5.5 7.5 5.5z" />
      </g>
    </template>
    <template v-else-if="game === 'blocks'">
      <rect x="4" y="4" width="56" height="56" rx="10" fill="var(--color-surface)" />
      <!-- A 4×4 board: a full row about to clear and a piece on its way. -->
      <g opacity=".14" fill="var(--game-blocks)">
        <rect v-for="i in 16" :key="i" :x="9 + ((i - 1) % 4) * 12" :y="9 + Math.floor((i - 1) / 4) * 12" width="10" height="10" rx="2" />
      </g>
      <g stroke="rgb(0 0 0 / 18%)" stroke-width="1">
        <rect x="9" y="33" width="10" height="10" rx="2" fill="#3b82f6" />
        <rect x="21" y="33" width="10" height="10" rx="2" fill="#3b82f6" />
        <rect x="33" y="33" width="10" height="10" rx="2" fill="#22c55e" />
        <rect x="45" y="33" width="10" height="10" rx="2" fill="#22c55e" />
        <rect x="9" y="45" width="10" height="10" rx="2" fill="#ef4444" />
        <rect x="45" y="45" width="10" height="10" rx="2" fill="#a855f7" />
        <rect x="33" y="45" width="10" height="10" rx="2" fill="#a855f7" />
        <rect x="21" y="9" width="10" height="10" rx="2" fill="#f97316" />
        <rect x="33" y="9" width="10" height="10" rx="2" fill="#f97316" />
        <rect x="33" y="21" width="10" height="10" rx="2" fill="#f97316" />
      </g>
      <path d="M8 38h48" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".7" />
    </template>
    <template v-else-if="game === 'mines'">
      <rect x="4" y="4" width="56" height="56" rx="10" fill="var(--color-surface)" />
      <!-- A 3×3 corner of a board: covered cells, a number, a flag and a mine. -->
      <g fill="var(--game-mines)" opacity=".22">
        <rect x="9" y="9" width="14" height="14" rx="3" />
        <rect x="25" y="9" width="14" height="14" rx="3" />
        <rect x="9" y="25" width="14" height="14" rx="3" />
        <rect x="41" y="41" width="14" height="14" rx="3" />
      </g>
      <g fill="var(--game-mines)" font-family="var(--font-sans)" font-weight="800" font-size="11" text-anchor="middle">
        <text x="48" y="20">1</text>
        <text x="32" y="36">2</text>
        <text x="16" y="52">1</text>
      </g>
      <path d="M45 26v12M42.5 38h6" stroke="var(--color-text)" stroke-width="1.6" stroke-linecap="round" />
      <path d="M45.6 26.4l6.4 2.8-6.4 2.8z" fill="#e2445c" />
      <g stroke="var(--color-text)" stroke-width="1.6" stroke-linecap="round">
        <path d="M32 42v12M26 48h12M27.8 43.8l8.4 8.4M36.2 43.8l-8.4 8.4" />
      </g>
      <circle cx="32" cy="48" r="4" fill="var(--color-text)" />
    </template>
    <template v-else>
      <rect x="4" y="4" width="56" height="56" rx="10" fill="var(--color-surface)" />
      <!-- Strawberry, orange, leaf and grapes – the fruit-garden pieces of the game. -->
      <path d="M20 31C13 29 8 22 9 16c1-4 6-5 11-4 5-1 10 0 11 4 1 6-4 13-11 15z" fill="#f0213f" />
      <path d="M13 12.5q3.5-4 7-1.5 3.5-2.5 7 1.5-3.5 2-7 1-3.5 1-7-1z" fill="#2fa84f" />
      <g fill="#ffe7a1">
        <circle cx="16" cy="18" r="1" /><circle cx="22" cy="18" r="1" /><circle cx="19" cy="23" r="1" />
      </g>
      <circle cx="44" cy="22" r="11" fill="#d96400" />
      <circle cx="43" cy="21" r="9.8" fill="#ff8a00" />
      <path d="M45 11q3-6 10-4-3 6-10 4z" fill="#2fa84f" />
      <circle cx="39.5" cy="17.5" r="2.4" fill="#fff" opacity=".55" />
      <g transform="rotate(32 20 44)">
        <path d="M20 32c9 5 10 17 0 24-10-7-9-19 0-24z" fill="#22b34c" />
        <path d="M20 34v21" stroke="#157a32" stroke-width="1.6" stroke-linecap="round" />
      </g>
      <g>
        <circle cx="38" cy="42" r="5" fill="#6c1fc0" /><circle cx="37.4" cy="41.4" r="4" fill="#9b40f2" />
        <circle cx="48" cy="42" r="5" fill="#6c1fc0" /><circle cx="47.4" cy="41.4" r="4" fill="#9b40f2" />
        <circle cx="43" cy="50" r="5" fill="#6c1fc0" /><circle cx="42.4" cy="49.4" r="4" fill="#9b40f2" />
        <path d="M43 37v-4" stroke="#7a4a1f" stroke-width="2" stroke-linecap="round" />
      </g>
    </template>
  </svg>
</template>

<style scoped>
.game-art {
  display: block;
  width: 72px;
  height: 72px;
  flex: none;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 12%));
}
</style>
