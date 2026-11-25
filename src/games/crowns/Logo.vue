<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
    <!-- Four glossy regions, two golden stars (as on the board). -->
    <rect x="8" y="8" width="24" height="24" rx="4" fill="#eb4773" />
    <rect x="32" y="8" width="24" height="24" rx="4" fill="#47c2eb" />
    <rect x="8" y="32" width="24" height="24" rx="4" fill="#47eb5d" />
    <rect x="32" y="32" width="24" height="24" rx="4" fill="#f0b642" />
    <path d="M8 32h48M32 8v48" stroke="#1d1b26" stroke-width="2" opacity=".55" />
    <g :fill="`url(#${ids.gold})`" stroke="#5a3000" stroke-width="1.2" stroke-linejoin="round">
      <path d="M44 11.5l2.5 6.8 7.2.3-5.7 4.5 2 7-6-4-6 4 2-7-5.7-4.5 7.2-.3z" />
      <path d="M20 35.5l2.5 6.8 7.2.3-5.7 4.5 2 7-6-4-6 4 2-7-5.7-4.5 7.2-.3z" />
    </g>
    <g fill="#fff" opacity=".85"><path d="M41.6 18.4l2-5 .9 3z" /><path d="M17.6 42.4l2-5 .9 3z" /></g>
  </g>
</template>
