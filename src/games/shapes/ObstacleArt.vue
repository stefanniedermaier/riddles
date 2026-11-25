<script setup lang="ts">
import { ensureSvgDefs } from '@/core/svgDefs'

/**
 * Original artwork for level obstacles (viewBox 0–100), used on the board and in the HUD.
 * - `target`: a patch of garden soil with grass tufts under a piece (clear it to "plant" it)
 * - `crate`:  wooden crate; `hp = 2` is reinforced with metal corners and bands
 * - `chain`:  two crossed steel chains with a small golden padlock lying over a piece
 */
defineProps<{ type: 'target' | 'crate' | 'chain'; hp?: number }>()

const LINKS = [10, 30, 50, 70, 90]
const soilId = 'ob-soil'
const steelId = 'ob-steel'
const goldId = 'ob-gold'
const woodId = 'ob-wood'
const frameId = 'ob-frame'
const metalId = 'ob-metal'

/** Light specks in the soil. */
const SPECKS: [number, number, number][] = [
  [18, 30, 2.2],
  [30, 80, 1.8],
  [74, 20, 2],
  [84, 62, 2.4],
  [62, 86, 1.6],
  [14, 58, 1.6],
  [44, 14, 1.4],
]

/** Metal corner brackets of a reinforced crate. */
const CORNERS = [
  'M3 28V11a8 8 0 0 1 8-8h17v10H13v15z',
  'M72 3h17a8 8 0 0 1 8 8v17H87V13H72z',
  'M97 72v17a8 8 0 0 1-8 8H72V87h15V72z',
  'M28 97H11a8 8 0 0 1-8-8V72h10v15h15z',
]

/** Gradients shared by every instance on the page (core/svgDefs.ts). */
ensureSvgDefs('obstacle-defs', `
<radialGradient id="ob-soil" cx="0.4" cy="0.35" r="0.8">
<stop offset="0" stop-color="#9a6a3e" />
<stop offset="0.6" stop-color="#7a4d26" />
<stop offset="1" stop-color="#55331a" />
</radialGradient>
<linearGradient id="ob-wood" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#d9994f" />
<stop offset="0.5" stop-color="#c07a35" />
<stop offset="1" stop-color="#9c5d24" />
</linearGradient>
<linearGradient id="ob-frame" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#b06a2a" />
<stop offset="1" stop-color="#7a4518" />
</linearGradient>
<linearGradient id="ob-metal" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#d7dde7" />
<stop offset="0.45" stop-color="#8d96a6" />
<stop offset="1" stop-color="#555d6c" />
</linearGradient>
<linearGradient id="ob-steel" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#ffffff" />
<stop offset="0.45" stop-color="#c3cad6" />
<stop offset="1" stop-color="#7c8698" />
</linearGradient>
<radialGradient id="ob-gold" cx="0.35" cy="0.3" r="0.8">
<stop offset="0" stop-color="#fff3a8" />
<stop offset="0.5" stop-color="#ffbf1f" />
<stop offset="1" stop-color="#c77800" />
</radialGradient>`)
</script>

<template>
  <svg class="obstacle" :class="`obstacle--${type}`" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <template v-if="type === 'target'">
      <rect x="3" y="3" width="94" height="94" rx="18" :fill="`url(#${soilId})`" class="soil" />
      <circle v-for="([x, y, r], i) in SPECKS" :key="i" :cx="x" :cy="y" :r="r" class="soil__speck" />
      <rect x="3" y="3" width="94" height="94" rx="18" class="soil__rim" />
      <!-- Grass tufts on the corners. -->
      <path d="M6 22Q8 10 12 6Q13 14 16 8Q16 16 22 6Q20 16 24 14Q16 22 6 22Z" class="tuft" />
      <path d="M94 78Q92 90 88 94Q87 86 84 92Q84 84 78 94Q80 84 76 86Q84 78 94 78Z" class="tuft" />
      <path d="M78 6Q86 4 94 8Q88 10 92 16Q86 12 84 18Q82 10 78 6Z" class="tuft tuft--light" />
      <path d="M22 94Q14 96 6 92Q12 90 8 84Q14 88 16 82Q18 90 22 94Z" class="tuft tuft--light" />
      <circle cx="12" cy="9" r="2.6" class="daisy" />
      <circle cx="88" cy="91" r="2.6" class="daisy" />
    </template>

    <template v-else-if="type === 'crate'">
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
      <path d="M12 8.5H88M8.5 12V60" class="crate__highlight" />
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
            :stroke="`url(#${steelId})`"
            class="obstacle__link"
          />
          <path
            v-if="i % 2 === 0"
            :d="`M${x - 5} 44.5H${x + 4}`"
            class="obstacle__link-shine"
          />
        </template>
      </g>
      <!-- Padlock where the chains cross. -->
      <g class="lock">
        <path d="M43 52V45a7 7 0 0 1 14 0v7" class="lock__shackle-outline" />
        <path d="M43 52V45a7 7 0 0 1 14 0v7" class="lock__shackle" />
        <rect x="38" y="50" width="24" height="19" rx="4" :fill="`url(#${goldId})`" class="lock__body" />
        <path d="M50 56.5a2.6 2.6 0 0 1 1.4 4.8L52.5 65h-5l1.1-3.7A2.6 2.6 0 0 1 50 56.5z" class="lock__hole" />
        <path d="M41.5 53.5h8" class="lock__shine" />
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

/* Target tile: a patch of garden soil – dark and warm, so it shows around the piece on top. */
.soil__speck {
  fill: #c99a66;
  opacity: 0.55;
}

.soil__rim {
  fill: none;
  stroke: #3d230f;
  stroke-width: 3.5;
}

.tuft {
  fill: #3cb850;
  stroke: #1d6b2a;
  stroke-width: 1.4;
  stroke-linejoin: round;
}

.tuft--light {
  fill: #7ee05a;
}

.daisy {
  fill: #fff;
  stroke: var(--gold);
  stroke-width: 1.6;
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

.crate__highlight {
  fill: none;
  stroke: rgb(255 230 190 / 55%);
  stroke-width: 2.5;
  stroke-linecap: round;
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
  stroke-width: 4;
}

.obstacle__link-shine {
  fill: none;
  stroke: #fff;
  stroke-width: 1.6;
  stroke-linecap: round;
  opacity: 0.9;
}

.lock__shackle-outline {
  fill: none;
  stroke: #1f2330;
  stroke-width: 7;
}

.lock__shackle {
  fill: none;
  stroke: #c3cad6;
  stroke-width: 3.5;
}

.lock {
  transform-origin: 50px 40px;
  animation: lock-swing 3.2s ease-in-out infinite;
}

@keyframes lock-swing {
  0%,
  70%,
  100% {
    transform: rotate(0deg);
  }
  78% {
    transform: rotate(-9deg);
  }
  86% {
    transform: rotate(6deg);
  }
  93% {
    transform: rotate(-2deg);
  }
}

:root[data-motion='reduced'] .lock {
  animation: none;
}

.lock__body {
  stroke: #6b3d00;
  stroke-width: 2.4;
}

.lock__hole {
  fill: #5a3000;
}

.lock__shine {
  fill: none;
  stroke: rgb(255 255 255 / 80%);
  stroke-width: 2;
  stroke-linecap: round;
}
</style>
