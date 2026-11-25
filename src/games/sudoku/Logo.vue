<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
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
  </g>
</template>
