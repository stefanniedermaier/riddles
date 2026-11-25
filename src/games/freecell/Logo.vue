<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
    <!-- Original card motifs, one per game. -->
    <!-- FreeCell: four free cells on top, one holding a card, an open column below. -->
    <g>
      <g fill="none" stroke="color-mix(in srgb, var(--game-freecell) 70%, #000)" stroke-width="1.2" stroke-dasharray="2.5 2">
        <rect x="7.5" y="8" width="11" height="15" rx="2" />
        <rect x="20.5" y="8" width="11" height="15" rx="2" />
        <rect x="46.5" y="8" width="11" height="15" rx="2" />
      </g>
      <rect x="33.5" y="8" width="11" height="15" rx="2" fill="#fff" stroke="#6f6b80" stroke-width="1.1" />
      <path d="M5 0l4 5-4 5-4-5z" fill="#c0262f" transform="translate(35.5 11) scale(.7)" />
      <rect x="14" y="28" width="22" height="28" rx="2.5" fill="#fff" stroke="#6f6b80" stroke-width="1.1" />
      <rect x="28" y="32" width="22" height="24" rx="2.5" fill="#fff" stroke="#6f6b80" stroke-width="1.1" />
      <text x="31" y="41" font-family="var(--font-sans)" font-weight="800" font-size="8" fill="#1d1b26">Q</text>
      <path d="M5 0C3.4 2.4 0 4.3 0 6.6c0 1.9 1.9 3 3.6 2.2.4-.2.7-.5.9-.8L4 10h2l-.5-2c.2.3.5.6.9.8C8.1 9.6 10 8.5 10 6.6 10 4.3 6.6 2.4 5 0z" fill="#1d1b26" transform="translate(37 44) scale(.9)" />
      <text x="17" y="37" font-family="var(--font-sans)" font-weight="800" font-size="8" fill="#c0262f">J</text>
    </g>
  </g>
</template>
