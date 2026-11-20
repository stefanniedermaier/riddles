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
const patternId = `stripes-${useId()}`
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
      <rect x="6" y="6" width="88" height="88" rx="8" class="obstacle__crate-body" />
      <path d="M8 34H92M8 66H92" class="obstacle__crate-plank" />
      <path d="M14 14L86 86" class="obstacle__crate-brace" />
      <rect x="6" y="6" width="88" height="88" rx="8" class="obstacle__crate-frame" />
      <g v-if="(hp ?? 1) >= 2" class="obstacle__crate-metal">
        <path d="M6 26V14a8 8 0 0 1 8-8h12M74 6h12a8 8 0 0 1 8 8v12M94 74v12a8 8 0 0 1-8 8H74M26 94H14a8 8 0 0 1-8-8V74" />
        <path d="M50 6V94" />
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

/* Crate: warm wood that differs from every piece colour, dark outline in both themes. */
.obstacle__crate-body {
  fill: #c98b4a;
}

.obstacle__crate-plank,
.obstacle__crate-brace {
  fill: none;
  stroke: #7a4a1f;
  stroke-width: 6;
  stroke-linecap: round;
}

.obstacle__crate-brace {
  stroke-width: 9;
  stroke: #a96b30;
}

.obstacle__crate-frame {
  fill: none;
  stroke: #4a2a10;
  stroke-width: 6;
}

.obstacle__crate-metal path {
  fill: none;
  stroke: #5b6170;
  stroke-width: 9;
  stroke-linecap: round;
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
