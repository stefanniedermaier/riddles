<script setup lang="ts">
import { useId } from 'vue'

/**
 * Star symbol of this game: a glossy golden star with a dark outline and a highlight, so it
 * reads on every region colour (scales with its container). A ghost (hint preview) is drawn
 * flat in the current colour; a conflict turns the star red.
 */
defineProps<{ ghost?: boolean; conflict?: boolean }>()

const uid = useId()
const goldId = `star-gold-${uid}`
const redId = `star-red-${uid}`
const STAR =
  'M16.00 3.50 L19.29 12.47 L28.84 12.83 L21.33 18.73 L23.94 27.92 L16.00 22.60 L8.06 27.92 L10.67 18.73 L3.16 12.83 L12.71 12.47Z'
</script>

<template>
  <svg class="star-glyph" :class="{ 'star-glyph--ghost': ghost }" viewBox="0 0 32 32" aria-hidden="true">
    <template v-if="ghost">
      <path :d="STAR" fill="currentColor" stroke="var(--color-surface)" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke" />
    </template>
    <template v-else>
      <defs>
        <radialGradient :id="goldId" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stop-color="#fff6b0" />
          <stop offset="0.5" stop-color="#ffc21a" />
          <stop offset="1" stop-color="#d97a00" />
        </radialGradient>
        <radialGradient :id="redId" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stop-color="#ffb0b8" />
          <stop offset="0.5" stop-color="#f2263f" />
          <stop offset="1" stop-color="#9c0a1e" />
        </radialGradient>
      </defs>
      <path :d="STAR" class="star-glyph__shadow" transform="translate(0 1.2)" />
      <path :d="STAR" :fill="`url(#${conflict ? redId : goldId})`" class="star-glyph__body" />
      <path d="M12.6 13.6 L15.2 6.9 L16.4 10.6Z" class="star-glyph__shine" />
      <circle cx="20.6" cy="16.4" r="1.1" class="star-glyph__sparkle" />
    </template>
  </svg>
</template>

<style scoped>
.star-glyph {
  display: block;
  width: 80%;
  height: 80%;
  overflow: visible;
}

.star-glyph__shadow {
  fill: rgb(0 0 0 / 30%);
}

.star-glyph__body {
  stroke: #5a3000;
  stroke-width: 1.5;
  stroke-linejoin: round;
}

.star-glyph__shine {
  fill: rgb(255 255 255 / 85%);
}

.star-glyph__sparkle {
  fill: #fff;
}
</style>
