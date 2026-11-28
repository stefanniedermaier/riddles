<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()

/** A cluster of energy orbs in a holo panel, a laser sight bouncing off the wall, a turret. */
const COLORS = [
  ['#ff3d63', '#ffc2cf'],
  ['#ff9124', '#ffdcb0'],
  ['#ffdd33', '#fff7c2'],
  ['#2ff09c', '#c4ffe4'],
  ['#38a6ff', '#c9e8ff'],
  ['#b45cff', '#ead1ff'],
] as const

const ORBS = [
  { x: 12.5, y: 12, c: 0 },
  { x: 22.5, y: 12, c: 0 },
  { x: 32.5, y: 12, c: 4 },
  { x: 42.5, y: 12, c: 2 },
  { x: 52.5, y: 12, c: 5 },
  { x: 17.5, y: 20.7, c: 3 },
  { x: 27.5, y: 20.7, c: 4 },
  { x: 37.5, y: 20.7, c: 4 },
  { x: 47.5, y: 20.7, c: 1 },
  { x: 22.5, y: 29.4, c: 3 },
]
</script>

<template>
  <g>
    <defs>
      <radialGradient v-for="(c, i) in COLORS" :id="`bubbles-logo-orb-${i}`" :key="i" cx="0.4" cy="0.36" r="0.68">
        <stop offset="0" :stop-color="c[1]" />
        <stop offset="0.45" :stop-color="c[0]" />
        <stop offset="1" :stop-color="c[0]" stop-opacity="0.75" />
      </radialGradient>
      <linearGradient id="bubbles-logo-panel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#101a48" />
        <stop offset="1" stop-color="#060a22" />
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="56" height="56" fill="url(#bubbles-logo-panel)" />
    <rect x="5" y="5" width="54" height="54" fill="none" stroke="#4ff3ff" stroke-opacity=".55" stroke-width="1" />
    <path d="M32 51 L53 33 L37.5 28" fill="none" stroke="#4ff3ff" stroke-opacity=".35" stroke-width="3" stroke-linejoin="round" />
    <path d="M32 51 L53 33 L37.5 28" fill="none" stroke="#fff" stroke-width="1.4" stroke-dasharray="0.4 2.6" stroke-linecap="round" />
    <g v-for="(b, i) in ORBS" :key="i">
      <circle :cx="b.x" :cy="b.y" r="4.8" :fill="`url(#bubbles-logo-orb-${b.c})`" />
      <circle :cx="b.x - 1.5" :cy="b.y - 1.6" r="1.3" fill="#fff" opacity=".75" />
    </g>
    <path d="M20 60 A12 9 0 0 1 44 60 Z" fill="#3a4378" stroke="#4ff3ff" stroke-width="1" />
    <path d="M29 52 L30 41 H34 L35 52 Z" fill="#a9b6e8" transform="rotate(49 32 53)" />
    <circle cx="32" cy="53" r="5.2" fill="#0d1230" stroke="#38a6ff" stroke-width="1.2" />
    <circle cx="32" cy="53" r="3.6" fill="url(#bubbles-logo-orb-4)" />
    <circle cx="31" cy="52" r="1" fill="#fff" opacity=".8" />
  </g>
</template>
