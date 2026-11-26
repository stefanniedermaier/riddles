<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
    <!-- A checkered field, the snake winding towards a red fruit. -->
    <g fill="color-mix(in srgb, var(--game-snake) 10%, var(--color-surface))">
      <template v-for="i in 49" :key="i">
        <rect v-if="(i - 1) % 2 === 0" :x="4 + ((i - 1) % 7) * 8" :y="4 + Math.floor((i - 1) / 7) * 8" width="8" height="8" />
      </template>
    </g>
    <path
      d="M12 52 V40 H28 V24 H42"
      fill="none"
      stroke="var(--game-snake)"
      stroke-width="9"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M12 52 V40 H28 V24 H42"
      fill="none"
      stroke="color-mix(in srgb, var(--game-snake) 55%, #fff)"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity=".55"
    />
    <circle cx="43" cy="24" r="6.5" fill="color-mix(in srgb, var(--game-snake) 82%, var(--color-text))" />
    <circle cx="45" cy="21" r="2" fill="#fff" />
    <circle cx="46" cy="21" r="1" fill="#15141b" />
    <circle cx="45" cy="27" r="2" fill="#fff" />
    <circle cx="46" cy="27" r="1" fill="#15141b" />
    <path d="M51 44 C52 40.5 55 40 56.5 41 C55.5 43 53 43.6 51 44 Z" fill="#3f8f2f" />
    <circle cx="51" cy="49" r="5" fill="#d83a2f" />
    <circle cx="49.3" cy="47.3" r="1.3" fill="#fff" opacity=".7" />
  </g>
</template>
