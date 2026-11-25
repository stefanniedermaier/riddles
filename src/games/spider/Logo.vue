<script setup lang="ts">
import type { LogoIds } from '@/components/logoIds'

/** Logo motif of this game, drawn into `GameArt`'s 64×64 frame (shared gradients: `ids`). */
defineProps<{ ids: LogoIds }>()
</script>

<template>
  <g>
    <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
    <!-- Original card motifs, one per game. -->
    <!-- Spider: a spider on its thread above a king of spades, a web in the corner. -->
    <g>
      <g fill="none" stroke="#8a8699" stroke-width=".8" opacity=".8">
        <path d="M60 4L42 4M60 4L60 22M60 4L47 17" />
        <path d="M55 4Q55 9 60 9M50 4Q50 14 60 14M45 4Q46 19 60 19" />
      </g>
      <rect x="9" y="24" width="24" height="32" rx="2.5" fill="#4338ca" stroke="#fff" stroke-width="1.6" transform="rotate(-10 21 40)" />
      <rect x="22" y="22" width="25" height="34" rx="2.5" fill="#fff" stroke="#6f6b80" stroke-width="1.1" transform="rotate(6 34 39)" />
      <text x="26" y="32" font-family="var(--font-sans)" font-weight="800" font-size="8" fill="#1d1b26" transform="rotate(6 34 39)">K</text>
      <path d="M5 0C3.4 2.4 0 4.3 0 6.6c0 1.9 1.9 3 3.6 2.2.4-.2.7-.5.9-.8L4 10h2l-.5-2c.2.3.5.6.9.8C8.1 9.6 10 8.5 10 6.6 10 4.3 6.6 2.4 5 0z" fill="#1d1b26" transform="rotate(6 34 39) translate(29 38) scale(1.25)" />
      <!-- The spider in the text colour: near black in light mode, near white in dark mode. -->
      <path d="M22 4v11" stroke="var(--color-text)" stroke-width=".9" />
      <g stroke="var(--color-text)" stroke-width="1.3" stroke-linecap="round" fill="none">
        <path d="M19 17l-4-3M19 19l-5 0M19 21l-4 3M19 23l-3 4M25 17l4-3M25 19l5 0M25 21l4 3M25 23l3 4" />
      </g>
      <ellipse cx="22" cy="17" rx="2.6" ry="2.2" fill="var(--color-text)" />
      <ellipse cx="22" cy="22" rx="3.6" ry="4" fill="var(--color-text)" />
      <ellipse cx="21" cy="20.6" rx="1.1" ry=".8" fill="#fff" opacity=".6" />
    </g>
  </g>
</template>
