<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()

/** A small cluster under the ceiling and a bubble on its way up, with its bounce path. */
const CLUSTER = [
  { x: 12, y: 12, c: 0 },
  { x: 22, y: 12, c: 0 },
  { x: 32, y: 12, c: 4 },
  { x: 42, y: 12, c: 2 },
  { x: 52, y: 12, c: 2 },
  { x: 17, y: 20.7, c: 3 },
  { x: 27, y: 20.7, c: 4 },
  { x: 37, y: 20.7, c: 4 },
  { x: 47, y: 20.7, c: 5 },
  { x: 22, y: 29.4, c: 3 },
]
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="color-mix(in srgb, var(--game-bubbles) 10%, var(--color-surface))" />
    <path d="M32 55 L47 41 L37 33" fill="none" stroke="var(--game-bubbles)" stroke-width="1.8" stroke-dasharray="0.5 3.2" stroke-linecap="round" />
    <g v-for="(b, i) in CLUSTER" :key="i">
      <circle :cx="b.x" :cy="b.y" r="4.8" :fill="`var(--bubble-${b.c})`" />
      <circle :cx="b.x - 1.5" :cy="b.y - 1.6" r="1.4" fill="#fff" opacity=".6" />
    </g>
    <circle cx="34.5" cy="35.2" r="4.8" fill="var(--bubble-4)" />
    <circle cx="33" cy="33.6" r="1.4" fill="#fff" opacity=".6" />
    <path d="M22 60 A10 10 0 0 1 42 60 Z" fill="var(--game-bubbles)" />
    <circle cx="32" cy="55" r="4.8" fill="var(--bubble-0)" />
    <circle cx="30.5" cy="53.4" r="1.4" fill="#fff" opacity=".6" />
  </g>
</template>
