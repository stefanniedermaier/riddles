<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
    <!-- A 4×4 board: a full row about to clear and an L piece – blocks with the game's bevel. -->
    <rect x="7" y="7" width="50" height="50" fill="color-mix(in srgb, var(--game-blocks) 12%, var(--color-surface))" />
    <g fill="color-mix(in srgb, var(--game-blocks) 18%, var(--color-surface))">
      <rect v-for="i in 16" :key="i" :x="8.5 + ((i - 1) % 4) * 12" :y="8.5 + Math.floor((i - 1) / 4) * 12" width="11" height="11" rx="2" />
    </g>
    <g>
      <rect x="8.5" y="32.5" width="11" height="11" rx="2" fill="#3b82f6" />
      <rect x="20.5" y="32.5" width="11" height="11" rx="2" fill="#3b82f6" />
      <rect x="32.5" y="32.5" width="11" height="11" rx="2" fill="#22c55e" />
      <rect x="44.5" y="32.5" width="11" height="11" rx="2" fill="#22c55e" />
      <rect x="8.5" y="44.5" width="11" height="11" rx="2" fill="#ef4444" />
      <rect x="32.5" y="44.5" width="11" height="11" rx="2" fill="#a855f7" />
      <rect x="44.5" y="44.5" width="11" height="11" rx="2" fill="#a855f7" />
      <rect x="20.5" y="8.5" width="11" height="11" rx="2" fill="#f97316" />
      <rect x="32.5" y="8.5" width="11" height="11" rx="2" fill="#f97316" />
      <rect x="32.5" y="20.5" width="11" height="11" rx="2" fill="#f97316" />
    </g>
    <!-- Bevel: light top edge, dark bottom edge, a gloss on every block. -->
    <g :fill="`url(#${ids.bevel})`">
      <rect x="8.5" y="32.5" width="11" height="11" rx="2" />
      <rect x="20.5" y="32.5" width="11" height="11" rx="2" />
      <rect x="32.5" y="32.5" width="11" height="11" rx="2" />
      <rect x="44.5" y="32.5" width="11" height="11" rx="2" />
      <rect x="8.5" y="44.5" width="11" height="11" rx="2" />
      <rect x="32.5" y="44.5" width="11" height="11" rx="2" />
      <rect x="44.5" y="44.5" width="11" height="11" rx="2" />
      <rect x="20.5" y="8.5" width="11" height="11" rx="2" />
      <rect x="32.5" y="8.5" width="11" height="11" rx="2" />
      <rect x="32.5" y="20.5" width="11" height="11" rx="2" />
    </g>
    <path d="M8 38.5h48" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85" />
  </g>
</template>
