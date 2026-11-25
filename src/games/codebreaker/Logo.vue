<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
    <!-- Two guesses with feedback dots and the hidden code on top – glossy pegs. -->
    <g fill="var(--color-surface-3)" stroke="#8a8798" stroke-width=".8">
      <circle cx="13" cy="14" r="5" /><circle cx="25" cy="14" r="5" /><circle cx="37" cy="14" r="5" />
    </g>
    <g stroke="#1d1b26" stroke-width=".9" stroke-opacity=".55">
      <circle cx="13" cy="31" r="5" fill="#d81b2c" /><circle cx="25" cy="31" r="5" fill="#1565d8" />
      <circle cx="37" cy="31" r="5" fill="#f2c200" />
      <circle cx="13" cy="47" r="5" fill="#1565d8" /><circle cx="25" cy="47" r="5" fill="#d81b2c" />
      <circle cx="37" cy="47" r="5" fill="#0f9438" />
    </g>
    <g :fill="`url(#${ids.peg})`">
      <circle cx="13" cy="31" r="5" /><circle cx="25" cy="31" r="5" /><circle cx="37" cy="31" r="5" />
      <circle cx="13" cy="47" r="5" /><circle cx="25" cy="47" r="5" /><circle cx="37" cy="47" r="5" />
    </g>
    <g fill="var(--game-codebreaker)">
      <circle cx="49" cy="28" r="2.4" /><circle cx="55" cy="28" r="2.4" fill="none" stroke="var(--game-codebreaker)" stroke-width="1.4" />
      <circle cx="49" cy="44" r="2.4" /><circle cx="55" cy="44" r="2.4" /><circle cx="49" cy="50" r="2.4" />
    </g>
    <path d="M8 22h40" stroke="var(--game-codebreaker)" stroke-width="1.5" opacity=".4" />
  </g>
</template>
