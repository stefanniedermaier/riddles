<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
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
  </g>
</template>
