<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
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
  </g>
</template>
