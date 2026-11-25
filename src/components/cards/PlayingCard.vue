<script setup lang="ts">
import { computed } from 'vue'

import { RANK_LABELS, type CardDef } from '@/core/cards/cards'

/**
 * One playing card as SVG. Suit symbols are paths (Unicode suit characters turn into
 * emoji on some phones). Original design: corner rank and suit, a large suit in the middle,
 * no face illustrations.
 */
const props = defineProps<{
  /** The card, or null for a face-down card. */
  card: CardDef | null
  /** Clubs green and diamonds blue. */
  fourColor?: boolean
}>()

/** Suit shapes in a 10 × 10 box: ♠ ♥ ♦ ♣. */
const SUIT_PATHS = [
  'M5 0C3.4 2.4 0 4.3 0 6.6c0 1.9 1.9 3 3.6 2.2.4-.2.7-.5.9-.8L4 10h2l-.5-2c.2.3.5.6.9.8C8.1 9.6 10 8.5 10 6.6 10 4.3 6.6 2.4 5 0z',
  'M5 9.6C3 7.8 0 5.6 0 3.2 0 1.4 1.3 0 3 0c.9 0 1.6.5 2 1.2C5.4.5 6.1 0 7 0c1.7 0 3 1.4 3 3.2 0 2.4-3 4.6-5 6.4z',
  'M5 0l4 5-4 5-4-5z',
  'M5 .2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 1 1 0-4.8zM2.5 3.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 1 1 0-4.8zm5 0a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 1 1 0-4.8zM4.3 6h1.4l.8 4h-3z',
] as const

/** Colours on the white card face, all ≥ 4.5:1. */
const COLORS = { black: '#1d1b26', red: '#c0262f', green: '#17773a', blue: '#1d5fc9' }

const color = computed(() => {
  const suit = props.card?.suit ?? 0
  if (props.fourColor && suit === 3) return COLORS.green
  if (props.fourColor && suit === 2) return COLORS.blue
  return suit === 1 || suit === 2 ? COLORS.red : COLORS.black
})

const rank = computed(() => (props.card ? RANK_LABELS[props.card.rank] : ''))
const path = computed(() => (props.card ? SUIT_PATHS[props.card.suit] : ''))
</script>

<template>
  <svg class="playing-card" viewBox="0 0 60 84" aria-hidden="true">
    <template v-if="card">
      <rect class="playing-card__face" x="0.75" y="0.75" width="58.5" height="82.5" rx="5" />
      <text
        class="playing-card__rank"
        :class="{ 'playing-card__rank--wide': rank === '10' }"
        x="5"
        y="19"
        :fill="color"
      >
        {{ rank }}
      </text>
      <!-- Next to the rank, so both stay visible in a fanned column. -->
      <path :d="path" :fill="color" transform="translate(39 5) scale(1.5)" />
      <path :d="path" :fill="color" transform="translate(21 41) scale(2.4)" />
    </template>
    <template v-else>
      <rect class="playing-card__back" x="0.75" y="0.75" width="58.5" height="82.5" rx="5" />
      <rect class="playing-card__inner" x="5" y="5" width="50" height="74" rx="3" />
      <path class="playing-card__pattern" d="M30 14l12 14-12 14-12-14zM30 42l12 14-12 14-12-14z" />
    </template>
  </svg>
</template>

<style scoped>
.playing-card {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.playing-card__face {
  fill: #fff;
  /* ≥ 3:1 against the table in both themes. */
  stroke: #8a8699;
  stroke-width: 1.2;
}

.playing-card__rank {
  font-family: var(--font-sans);
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.playing-card__rank--wide {
  font-size: 16px;
  letter-spacing: -0.08em;
}

.playing-card__back {
  fill: var(--card-back, var(--color-accent));
  stroke: color-mix(in srgb, var(--card-back, var(--color-accent)) 70%, #000);
  stroke-width: 1.2;
}

.playing-card__inner {
  fill: none;
  stroke: rgb(255 255 255 / 55%);
  stroke-width: 1.5;
}

.playing-card__pattern {
  fill: rgb(255 255 255 / 22%);
}
</style>
