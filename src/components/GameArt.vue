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
      <g opacity=".85">
        <rect x="8" y="8" width="24" height="24" rx="4" fill="#f4b7c4" />
        <rect x="32" y="8" width="24" height="24" rx="4" fill="#bcd7f5" />
        <rect x="8" y="32" width="24" height="24" rx="4" fill="#c4e7c0" />
        <rect x="32" y="32" width="24" height="24" rx="4" fill="#f5dfa6" />
      </g>
      <path
        d="M37 26l-1.5-9 5 4 3.5-6 3.5 6 5-4L51 26z"
        fill="var(--game-crowns)"
        stroke="var(--game-crowns)"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path
        d="M13 50l-1.5-9 5 4 3.5-6 3.5 6 5-4L27 50z"
        fill="var(--game-crowns)"
        stroke="var(--game-crowns)"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
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
    <template v-else>
      <rect x="4" y="4" width="56" height="56" rx="10" fill="var(--color-surface)" />
      <circle cx="19" cy="19" r="8" fill="#e2445c" />
      <path d="M45 10l9 16H36z" fill="#f08a24" stroke="#f08a24" stroke-width="2" stroke-linejoin="round" />
      <path d="M19 36l9 9-9 9-9-9z" fill="#2f9e6e" stroke="#2f9e6e" stroke-width="2" stroke-linejoin="round" />
      <rect x="37" y="37" width="16" height="16" rx="3" fill="#3a72d6" />
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
