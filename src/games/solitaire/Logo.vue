<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
    <!-- Original card motifs, one per game. -->
    <!-- Solitaire: a tableau column – face-down cards in a staircase, the ace of hearts on top. -->
    <g>
      <rect x="16" y="7" width="26" height="30" rx="2.5" fill="var(--game-solitaire)" stroke="#fff" stroke-width="1.6" />
      <rect x="16" y="13" width="26" height="30" rx="2.5" fill="var(--game-solitaire)" stroke="#fff" stroke-width="1.6" />
      <rect x="16" y="19" width="26" height="30" rx="2.5" fill="var(--game-solitaire)" stroke="#fff" stroke-width="1.6" />
      <rect x="16" y="25" width="26" height="32" rx="2.5" fill="#fff" stroke="#6f6b80" stroke-width="1.1" />
      <text x="19.5" y="34" font-family="var(--font-sans)" font-weight="800" font-size="8" fill="#c0262f">A</text>
      <path d="M5 9.6C3 7.8 0 5.6 0 3.2 0 1.4 1.3 0 3 0c.9 0 1.6.5 2 1.2C5.4.5 6.1 0 7 0c1.7 0 3 1.4 3 3.2 0 2.4-3 4.6-5 6.4z" fill="#c0262f" transform="translate(23 39) scale(1.2)" />
    </g>
  </g>
</template>
