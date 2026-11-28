<script setup lang="ts">
import { computed } from 'vue'

import { BOMB, isColor, RAINBOW, STONE } from './logic/types'

/**
 * One bubble, drawn at `(x, y)` in board units (one bubble = diameter 1): a glossy ball in its
 * colour with an embossed symbol (circle, triangle, square, diamond, star, heart – one per
 * colour, so colour is never the only cue), a grey stone, a bomb or a rainbow bubble.
 * Colours come from the `--bubble-<n>` tokens of the board (light and dark variants).
 */
const props = withDefaults(
  defineProps<{
    value: number
    x: number
    y: number
    /** Show the colour's symbol. */
    symbols?: boolean
    /** A level target ("bring down the marked bubbles"). */
    marked?: boolean
    /** Id of the board's highlight gradient. */
    shine: string
  }>(),
  { symbols: true, marked: false },
)

/** Symbols of the six colours, centred on 0 0, about 0.4 wide. */
const SYMBOLS = [
  'M0 -0.15 A0.15 0.15 0 1 1 0 0.15 A0.15 0.15 0 1 1 0 -0.15 Z M0 -0.07 A0.07 0.07 0 1 0 0 0.07 A0.07 0.07 0 1 0 0 -0.07 Z',
  'M0 -0.19 L0.18 0.13 L-0.18 0.13 Z',
  'M-0.14 -0.14 H0.14 V0.14 H-0.14 Z',
  'M0 -0.2 L0.17 0 L0 0.2 L-0.17 0 Z',
  starPath(0.2, 0.085),
  'M0 0.17 C-0.24 0.02 -0.2 -0.17 -0.09 -0.17 C-0.04 -0.17 0 -0.13 0 -0.09 C0 -0.13 0.04 -0.17 0.09 -0.17 C0.2 -0.17 0.24 0.02 0 0.17 Z',
]

function starPath(outer: number, inner: number): string {
  const points: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI / 5) * i - Math.PI / 2
    points.push(`${(Math.cos(a) * r).toFixed(3)} ${(Math.sin(a) * r + 0.015).toFixed(3)}`)
  }
  return `M${points.join(' L')} Z`
}

/** Six wedges of the rainbow bubble. */
const WEDGES = Array.from({ length: 6 }, (_, i) => {
  const r = 0.46
  const a0 = (Math.PI / 3) * i - Math.PI / 2
  const a1 = a0 + Math.PI / 3
  const p = (a: number) => `${(Math.cos(a) * r).toFixed(3)} ${(Math.sin(a) * r).toFixed(3)}`
  return { d: `M0 0 L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z`, color: i }
})

const kind = computed(() =>
  isColor(props.value) ? 'color' : props.value === STONE ? 'stone' : props.value === BOMB ? 'bomb' : props.value === RAINBOW ? 'rainbow' : 'none',
)
</script>

<template>
  <g class="bubble" :class="`bubble--${kind}`" :transform="`translate(${x.toFixed(3)} ${y.toFixed(3)})`">
    <template v-if="kind === 'color'">
      <circle class="bubble__ball" r="0.47" :style="{ '--c': `var(--bubble-${value})` }" />
      <path v-if="symbols" class="bubble__symbol" :d="SYMBOLS[value]" :style="{ '--c': `var(--bubble-${value})` }" />
    </template>
    <template v-else-if="kind === 'stone'">
      <circle class="bubble__stone" r="0.47" />
      <path class="bubble__crack" d="M-0.22 -0.12 L-0.04 0 L-0.1 0.2 M-0.04 0 L0.18 -0.06 L0.24 0.1" />
    </template>
    <template v-else-if="kind === 'bomb'">
      <circle class="bubble__bomb" r="0.44" cy="0.03" />
      <path class="bubble__fuse" d="M0.12 -0.36 Q0.2 -0.5 0.33 -0.44" />
      <circle class="bubble__spark" cx="0.34" cy="-0.44" r="0.08" />
    </template>
    <template v-else-if="kind === 'rainbow'">
      <path v-for="wedge in WEDGES" :key="wedge.color" :d="wedge.d" :style="{ fill: `var(--bubble-${wedge.color})` }" />
      <circle class="bubble__core" r="0.17" />
    </template>
    <circle v-if="kind !== 'none'" class="bubble__shine" r="0.47" :fill="`url(#${shine})`" />
    <g v-if="marked" class="bubble__mark">
      <circle r="0.36" class="bubble__mark-back" />
      <circle r="0.36" class="bubble__mark-ring" />
    </g>
  </g>
</template>

<style scoped>
.bubble__ball {
  fill: var(--c);
  stroke: color-mix(in srgb, var(--c) 70%, #000);
  stroke-width: 0.04;
}

/* Embossed: a darker shade of the bubble's own colour with a light edge. */
.bubble__symbol {
  fill: color-mix(in srgb, var(--c) 45%, #000);
  stroke: color-mix(in srgb, var(--c) 40%, #fff);
  stroke-width: 0.025;
  fill-rule: evenodd;
}

.bubble__stone {
  fill: var(--bubble-stone);
  stroke: color-mix(in srgb, var(--bubble-stone) 60%, #000);
  stroke-width: 0.05;
}

.bubble__crack {
  fill: none;
  stroke: color-mix(in srgb, var(--bubble-stone) 45%, #000);
  stroke-width: 0.045;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.bubble__bomb {
  fill: #2a2a33;
  stroke: #0d0d12;
  stroke-width: 0.04;
}

.bubble__fuse {
  fill: none;
  stroke: #8a6d3b;
  stroke-width: 0.06;
  stroke-linecap: round;
}

.bubble__spark {
  fill: #ffcf33;
  animation: spark 0.6s ease-in-out infinite alternate;
  transform-box: fill-box;
  transform-origin: center;
}

.bubble__core {
  fill: #fff;
  opacity: 0.9;
}

.bubble__shine {
  pointer-events: none;
}

/* A level target: a white ring with a dark dashed edge – visible on every colour. */
.bubble__mark circle {
  fill: none;
}

.bubble__mark-back {
  stroke: #fff;
  stroke-width: 0.11;
}

.bubble__mark-ring {
  stroke: #1d1b26;
  stroke-width: 0.05;
  stroke-dasharray: 0.12 0.08;
}

@keyframes spark {
  to {
    transform: scale(1.5);
    fill: #ff7a1a;
  }
}

:root[data-motion='reduced'] .bubble__spark {
  animation: none;
}
</style>
