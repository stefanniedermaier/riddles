<script setup lang="ts">
import { useId } from 'vue'

/**
 * Original artwork for level obstacles (viewBox 0–100), used on the board and in the HUD.
 * - `target`: marked tile under a piece (striped, framed)
 * - `crate`:  wooden crate; `hp = 2` is reinforced with metal corners and bands
 * - `chain`:  two crossed chains lying over a piece
 */
defineProps<{ type: 'target' | 'crate' | 'chain'; hp?: number }>()

const LINKS = [10, 30, 50, 70, 90]
const uid = useId()
const patternId = `stripes-${uid}`
const woodId = `wood-${uid}`
const frameId = `frame-${uid}`
const metalId = `metal-${uid}`

/** Metal corner brackets of a reinforced crate. */
const CORNERS = [
  'M3 28V11a8 8 0 0 1 8-8h17v10H13v15z',
  'M72 3h17a8 8 0 0 1 8 8v17H87V13H72z',
  'M97 72v17a8 8 0 0 1-8 8H72V87h15V72z',
  'M28 97H11a8 8 0 0 1-8-8V72h10v15h15z',
]
</script>

<template>
  <svg class="obstacle" :class="`obstacle--${type}`" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <template v-if="type === 'target'">
      <defs>
        <pattern :id="patternId" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="14" class="obstacle__stripe" />
        </pattern>
      </defs>
      <rect x="4" y="4" width="92" height="92" rx="14" class="obstacle__target-fill" />
      <rect x="4" y="4" width="92" height="92" rx="14" :fill="`url(#${patternId})`" />
      <rect x="4" y="4" width="92" height="92" rx="14" class="obstacle__target-frame" />
    </template>

    <template v-else-if="type === 'crate'">
      <defs>
        <linearGradient :id="woodId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#d9994f" />
          <stop offset="0.5" stop-color="#c07a35" />
          <stop offset="1" stop-color="#9c5d24" />
        </linearGradient>
        <linearGradient :id="frameId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#b06a2a" />
          <stop offset="1" stop-color="#7a4518" />
        </linearGradient>
        <linearGradient :id="metalId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d7dde7" />
          <stop offset="0.45" stop-color="#8d96a6" />
          <stop offset="1" stop-color="#555d6c" />
        </linearGradient>
      </defs>
      <!-- Back panel: three planks with dark gaps and a little grain. -->
      <rect x="5" y="5" width="90" height="90" rx="7" class="crate__shadow" />
      <rect x="5" y="5" width="90" height="90" rx="7" :fill="`url(#${woodId})`" />
      <path d="M17 37H83M17 63H83" class="crate__gap" />
      <path d="M22 24Q40 20 58 25T80 23M24 50Q44 46 62 51T78 49M20 76Q38 72 56 77T82 75" class="crate__grain" />
      <!-- Diagonal brace. -->
      <path d="M20 26L74 80" class="crate__brace-shadow" />
      <path d="M26 20L80 74" class="crate__brace" />
      <path d="M26 20L80 74" :stroke="`url(#${frameId})`" class="crate__brace-wood" />
      <!-- Frame boards. -->
      <path
        d="M5 12a7 7 0 0 1 7-7h76a7 7 0 0 1 7 7v76a7 7 0 0 1-7 7H12a7 7 0 0 1-7-7zM17 17v66h66V17z"
        :fill="`url(#${frameId})`"
        fill-rule="evenodd"
      />
      <path d="M17 17h66v66H17z" class="crate__inner-edge" />
      <rect x="5" y="5" width="90" height="90" rx="7" class="crate__outline" />
      <!-- Nails. -->
      <g class="crate__nail">
        <circle cx="11" cy="11" r="2.6" />
        <circle cx="89" cy="11" r="2.6" />
        <circle cx="11" cy="89" r="2.6" />
        <circle cx="89" cy="89" r="2.6" />
        <circle cx="50" cy="11" r="2.2" />
        <circle cx="50" cy="89" r="2.2" />
      </g>
      <!-- Reinforced crate: metal corners and a band with rivets. -->
      <g v-if="(hp ?? 1) >= 2">
        <path
          v-for="(corner, i) in CORNERS"
          :key="i"
          :d="corner"
          :fill="`url(#${metalId})`"
          class="crate__metal"
        />
        <rect x="44" y="3" width="12" height="94" rx="3" :fill="`url(#${metalId})`" class="crate__metal" />
        <g class="crate__rivet">
          <circle cx="50" cy="24" r="2.6" />
          <circle cx="50" cy="50" r="2.6" />
          <circle cx="50" cy="76" r="2.6" />
          <circle cx="13" cy="13" r="2.6" />
          <circle cx="87" cy="13" r="2.6" />
          <circle cx="13" cy="87" r="2.6" />
          <circle cx="87" cy="87" r="2.6" />
        </g>
      </g>
    </template>

    <template v-else>
      <g v-for="(direction, d) in [45, -45]" :key="d" :transform="`rotate(${direction} 50 50)`">
        <template v-for="(x, i) in LINKS" :key="i">
          <rect
            :x="x - 9"
            :y="i % 2 === 0 ? 42 : 46"
            width="18"
            :height="i % 2 === 0 ? 16 : 8"
            :rx="i % 2 === 0 ? 8 : 4"
            class="obstacle__link-outline"
          />
          <rect
            :x="x - 9"
            :y="i % 2 === 0 ? 42 : 46"
            width="18"
            :height="i % 2 === 0 ? 16 : 8"
            :rx="i % 2 === 0 ? 8 : 4"
            class="obstacle__link"
          />
        </template>
      </g>
    </template>
  </svg>
</template>

<style scoped>
.obstacle {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* Target tile: shapes accent, clearly visible around the piece on top of it. */
.obstacle__target-fill {
  fill: color-mix(in srgb, var(--game-shapes) 26%, transparent);
}

.obstacle__stripe {
  fill: color-mix(in srgb, var(--game-shapes) 30%, transparent);
}

.obstacle__target-frame {
  fill: none;
  stroke: var(--game-shapes);
  stroke-width: 6;
}

/* Crate: wooden planks in a frame, dark outline in both themes. */
.crate__shadow {
  fill: #3a210c;
  transform: translate(0, 2px);
}

.crate__gap {
  fill: none;
  stroke: #5a3412;
  stroke-width: 3;
}

.crate__grain {
  fill: none;
  stroke: #8a521f;
  stroke-width: 1.6;
  stroke-linecap: round;
  opacity: 0.6;
}

.crate__brace-shadow {
  fill: none;
  stroke: rgb(40 20 5 / 45%);
  stroke-width: 13;
  stroke-linecap: round;
}

.crate__brace {
  fill: none;
  stroke: #4a2a10;
  stroke-width: 14;
  stroke-linecap: round;
}

.crate__brace-wood {
  fill: none;
  stroke-width: 10;
  stroke-linecap: round;
}

.crate__inner-edge {
  fill: none;
  stroke: #4a2a10;
  stroke-width: 2;
  opacity: 0.7;
}

.crate__outline {
  fill: none;
  stroke: #3a210c;
  stroke-width: 4;
}

.crate__nail circle {
  fill: #c9cfd8;
  stroke: #3a3f4a;
  stroke-width: 1.2;
}

.crate__metal {
  stroke: #2f3440;
  stroke-width: 2;
  stroke-linejoin: round;
}

.crate__rivet circle {
  fill: #eef1f6;
  stroke: #2f3440;
  stroke-width: 1.4;
}

/* Chain: steel links – light core with a dark outline, readable on every piece colour. */
.obstacle__link-outline {
  fill: none;
  stroke: #1f2330;
  stroke-width: 8;
}

.obstacle__link {
  fill: none;
  stroke: #d4d9e3;
  stroke-width: 3.5;
}
</style>
