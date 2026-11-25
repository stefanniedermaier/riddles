<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
    <!-- Original card motifs, one per game. -->
    <!-- TriPeaks: a peak of cards. -->
    <g>
      <rect x="23" y="9" width="18" height="25" rx="2.5" fill="var(--game-tripeaks)" stroke="#fff" stroke-width="1.6" />
      <rect x="11" y="22" width="18" height="25" rx="3" fill="#fff" stroke="#8a8699" stroke-width="1.2" />
      <rect x="35" y="22" width="18" height="25" rx="3" fill="#fff" stroke="#8a8699" stroke-width="1.2" />
      <text x="15" y="33" font-family="var(--font-sans)" font-weight="800" font-size="9" fill="#c0262f">7</text>
      <text x="39" y="33" font-family="var(--font-sans)" font-weight="800" font-size="9" fill="#1d1b26">8</text>
      <rect x="23" y="42" width="18" height="16" rx="3" fill="#fff" stroke="#8a8699" stroke-width="1.2" />
      <text x="27" y="53" font-family="var(--font-sans)" font-weight="800" font-size="9" fill="#c0262f">9</text>
    </g>
  </g>
</template>
