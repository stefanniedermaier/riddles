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
