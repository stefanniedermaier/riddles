<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
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
  </g>
</template>
