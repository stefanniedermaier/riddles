<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
    <!-- A corner of the board: glossy meadow tiles, sand with numbers, a flag and a mine. -->
    <rect x="8" y="8" width="48" height="48" rx="5" fill="#f6efdc" />
    <g :fill="`url(#${ids.meadow})`" stroke="#2f6b2a" stroke-width="1">
      <rect x="9" y="9" width="14.5" height="14.5" rx="3" />
      <rect x="24.8" y="9" width="14.5" height="14.5" rx="3" />
      <rect x="9" y="24.8" width="14.5" height="14.5" rx="3" />
      <rect x="40.5" y="40.5" width="14.5" height="14.5" rx="3" />
    </g>
    <g font-family="var(--font-sans)" font-weight="800" font-size="11" text-anchor="middle">
      <text x="48" y="20" fill="#1d5fc9">1</text>
      <text x="32" y="36" fill="#17773a">2</text>
      <text x="16" y="52" fill="#1d5fc9">1</text>
    </g>
    <rect x="43.6" y="26" width="1.6" height="12" rx=".8" fill="#7a4a1f" />
    <path d="M45.2 26.3q3.4-1 6.8 1.6-3 1.4 0 3.8-3.4-1.2-6.8 0z" fill="#f2263f" stroke="#6e0614" stroke-width=".7" stroke-linejoin="round" />
    <ellipse cx="44.4" cy="38.2" rx="4" ry="1.3" fill="#6b4a2a" />
    <g stroke="#23262f" stroke-width="1.8" stroke-linecap="round">
      <path d="M32 41v14M25 48h14M27 43l10 10M37 43l-10 10" />
    </g>
    <circle cx="32" cy="48" r="4.6" :fill="`url(#${ids.bomb})`" stroke="#05060a" stroke-width=".6" />
    <ellipse cx="30.4" cy="46.4" rx="1.4" ry=".9" fill="#fff" opacity=".8" />
  </g>
</template>
