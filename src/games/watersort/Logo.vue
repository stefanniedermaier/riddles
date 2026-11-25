<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
    <!-- Three test tubes with a lip and shaded water, one almost sorted. -->
    <defs>
      <clipPath :id="ids.tube1"><path d="M10 12v41a6 6 0 0 0 12 0V12z" /></clipPath>
      <clipPath :id="ids.tube2"><path d="M26 12v41a6 6 0 0 0 12 0V12z" /></clipPath>
      <clipPath :id="ids.tube3"><path d="M42 12v41a6 6 0 0 0 12 0V12z" /></clipPath>
    </defs>
    <g :clip-path="`url(#${ids.tube1})`">
      <rect x="10" y="36" width="12" height="7" fill="#1565d8" />
      <rect x="10" y="43" width="12" height="7" fill="#d81b2c" />
      <rect x="10" y="50" width="12" height="10" fill="#f2c200" />
    </g>
    <g :clip-path="`url(#${ids.tube2})`">
      <rect x="26" y="22" width="12" height="21" fill="#d81b2c" />
      <rect x="26" y="43" width="12" height="17" fill="#1565d8" />
    </g>
    <g :clip-path="`url(#${ids.tube3})`">
      <rect x="42" y="43" width="12" height="17" fill="#f2c200" />
    </g>
    <g :fill="`url(#${ids.liquid})`">
      <path d="M10 36h12v24H10zM26 22h12v38H26zM42 43h12v17H42z" />
    </g>
    <g fill="none" stroke="#6b5a8a" stroke-width="1.8" stroke-linejoin="round">
      <path d="M10 12v41a6 6 0 0 0 12 0V12" />
      <path d="M26 12v41a6 6 0 0 0 12 0V12" />
      <path d="M42 12v41a6 6 0 0 0 12 0V12" />
    </g>
    <g fill="#fff" stroke="#6b5a8a" stroke-width="1.4">
      <rect x="8" y="9" width="16" height="4" rx="2" />
      <rect x="24" y="9" width="16" height="4" rx="2" />
      <rect x="40" y="9" width="16" height="4" rx="2" />
    </g>
    <g fill="#fff" opacity=".6"><rect x="12.5" y="15" width="2" height="36" rx="1" /><rect x="28.5" y="15" width="2" height="36" rx="1" /><rect x="44.5" y="15" width="2" height="36" rx="1" /></g>
  </g>
</template>
