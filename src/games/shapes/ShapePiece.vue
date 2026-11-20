<script setup lang="ts">
import { computed } from 'vue'

import type { Special } from './logic/types'

/**
 * One game piece as inline SVG (viewBox 0–100). Every kind has its own colour *and*
 * outline, so pieces can be told apart without colour vision.
 */
const props = defineProps<{ kind: number; special: Special }>()

function polygon(points: [number, number][]): string {
  return `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`
}

function regular(count: number, radius: number, cx: number, cy: number, inner?: number) {
  const points: [number, number][] = []
  const steps = inner === undefined ? count : count * 2
  for (let i = 0; i < steps; i++) {
    const r = inner === undefined || i % 2 === 0 ? radius : inner
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / steps
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
  }
  return polygon(points)
}

const SHAPES = [
  'M15 50A35 35 0 1 1 85 50A35 35 0 1 1 15 50Z', // circle
  'M50 14L86 78L14 78Z', // triangle
  'M23 23H77V77H23Z', // square
  'M50 12L88 50L50 88L12 50Z', // diamond
  regular(6, 38, 50, 50), // hexagon
  regular(5, 41, 50, 53, 18), // star
]

const WEDGES = Array.from({ length: 6 }, (_, i) => {
  const a0 = -Math.PI / 2 + (i * Math.PI) / 3
  const a1 = a0 + Math.PI / 3
  const p = (a: number) => `${(50 + 38 * Math.cos(a)).toFixed(1)} ${(50 + 38 * Math.sin(a)).toFixed(1)}`
  return `M50 50L${p(a0)}A38 38 0 0 1 ${p(a1)}Z`
})

const ARROW_BAR = 'M8 50L21 38V45H79V38L92 50L79 62V55H21V62Z'

const shape = computed(() => SHAPES[props.kind] ?? SHAPES[0]!)
const color = computed(() => `var(--shape-${props.kind})`)
</script>

<template>
  <svg class="shape-piece" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <template v-if="special === 'prism'">
      <circle cx="50" cy="50" r="44" class="shape-piece__prism-ring" />
      <path v-for="(d, i) in WEDGES" :key="i" :d="d" :fill="`var(--shape-${i})`" />
      <path :d="SHAPES[5]" transform="translate(32 32) scale(0.36)" fill="#fff" />
    </template>
    <template v-else>
      <path
        :d="shape"
        :fill="color"
        :stroke="color"
        stroke-width="8"
        stroke-linejoin="round"
      />
      <path :d="shape" fill="#fff" opacity="0.28" transform="translate(22 19) scale(0.5)" />
      <path
        v-if="special === 'line-h' || special === 'line-v'"
        :d="ARROW_BAR"
        :transform="special === 'line-v' ? 'rotate(90 50 50)' : undefined"
        class="shape-piece__mark"
      />
      <g v-else-if="special === 'burst'">
        <circle cx="50" cy="50" r="19" fill="none" stroke="rgb(0 0 0 / 45%)" stroke-width="11" />
        <circle cx="50" cy="50" r="19" fill="none" stroke="#fff" stroke-width="6" />
        <circle cx="50" cy="50" r="6" fill="#fff" />
      </g>
    </template>
  </svg>
</template>

<style scoped>
.shape-piece {
  --shape-0: #e0435a;
  --shape-1: #f08a24;
  --shape-2: #e3b00b;
  --shape-3: #2f9e6e;
  --shape-4: #3a72d6;
  --shape-5: #8b5cf6;

  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

:root[data-theme='dark'] .shape-piece {
  --shape-0: #ff6b81;
  --shape-1: #ff9f45;
  --shape-2: #f6c945;
  --shape-3: #43c08a;
  --shape-4: #5b9bff;
  --shape-5: #a78bfa;
}

.shape-piece__mark {
  fill: #fff;
  stroke: rgb(0 0 0 / 45%);
  stroke-width: 3;
  stroke-linejoin: round;
}

.shape-piece__prism-ring {
  fill: #fff;
  stroke: rgb(0 0 0 / 25%);
  stroke-width: 3;
}
</style>
