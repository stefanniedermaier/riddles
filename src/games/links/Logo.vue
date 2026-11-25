<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
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
  </g>
</template>
