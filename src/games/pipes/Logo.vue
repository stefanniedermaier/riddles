<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
    <!-- A small pipe network: water from the tank fills the connected pipes. -->
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="6">
      <path d="M32 32H48V14M32 32V50H16" stroke="var(--game-pipes)" />
      <path d="M16 50V36M48 14H16V24" stroke="var(--game-pipes)" opacity=".3" />
    </g>
    <circle cx="32" cy="32" r="7" fill="var(--game-pipes)" stroke="var(--color-surface)" stroke-width="2" />
    <circle cx="16" cy="36" r="4" fill="var(--color-surface)" stroke="var(--game-pipes)" stroke-width="2" opacity=".5" />
  </g>
</template>
