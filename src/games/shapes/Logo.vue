<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
    <!-- Strawberry, orange, leaf and grapes – glossy, outlined, as on the Shapes board. -->
    <path d="M20 31C13 29 8 22 9 16c1-4 6-5 11-4 5-1 10 0 11 4 1 6-4 13-11 15z" :fill="`url(#${ids.red})`" stroke="#7d0718" stroke-width="1" />
    <g fill="#fff1b0"><circle cx="15.5" cy="18" r=".9" /><circle cx="22.5" cy="18" r=".9" /><circle cx="19" cy="23.5" r=".9" /><circle cx="14" cy="22" r=".8" /><circle cx="24" cy="22" r=".8" /></g>
    <path d="M12.5 12.5q3.5-4.5 7.5-1.5 3.5-3 7.5 1.5-3.5 2.5-7.5 1.5-4 1-7.5-1.5z" :fill="`url(#${ids.leaf})`" stroke="#145f24" stroke-width=".8" />
    <ellipse cx="13.6" cy="18" rx="1.8" ry="3.4" transform="rotate(-24 13.6 18)" fill="#fff" opacity=".7" />
    <circle cx="44" cy="22" r="10.5" :fill="`url(#${ids.orange})`" stroke="#9c4100" stroke-width="1" />
    <path d="M45 11.5q3-6 10-4-3 6-10 4z" :fill="`url(#${ids.leaf})`" stroke="#145f24" stroke-width=".8" />
    <ellipse cx="39.5" cy="17.5" rx="3.2" ry="2" transform="rotate(-38 39.5 17.5)" fill="#fff" opacity=".75" />
    <g transform="rotate(32 20 44)">
      <path d="M20 32c9 5 10 17 0 24-10-7-9-19 0-24z" :fill="`url(#${ids.green})`" stroke="#0b5a20" stroke-width="1" />
      <path d="M20 34v21" stroke="#d4ff9e" stroke-width="1.4" stroke-linecap="round" opacity=".85" />
      <ellipse cx="16.5" cy="40" rx="1.3" ry="3.6" fill="#fff" opacity=".6" />
    </g>
    <path d="M43 37v-4" stroke="#6b3d14" stroke-width="2" stroke-linecap="round" />
    <g :fill="`url(#${ids.purple})`" stroke="#430a80" stroke-width=".9">
      <circle cx="38" cy="42" r="4.8" /><circle cx="48" cy="42" r="4.8" /><circle cx="43" cy="50" r="4.8" />
    </g>
    <g fill="#fff" opacity=".7"><ellipse cx="36.4" cy="40.4" rx="1.4" ry=".9" /><ellipse cx="46.4" cy="40.4" rx="1.4" ry=".9" /><ellipse cx="41.4" cy="48.4" rx="1.4" ry=".9" /></g>
  </g>
</template>
