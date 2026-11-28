<script setup lang="ts">
import { computed } from 'vue'

import { ORB_COLORS } from './colors'
import { BOMB, isColor, RAINBOW, STONE } from './logic/types'

/**
 * One bubble, drawn at `(x, y)` in board units (diameter 1), as an energy orb: a soft halo,
 * a glowing body with a bright core and a darker edge, a rim light and a highlight. Every
 * colour carries its own glyph (ring, triangle, square, diamond, star, heart), so colour is
 * never the only cue. Specials: an asteroid (stone), a nova mine (bomb) and a prism orb
 * (rainbow). Gradients come from `BubbleDefs` (`ids`).
 */
const props = withDefaults(
  defineProps<{
    value: number
    x: number
    y: number
    ids: string
    symbols?: boolean
    /** A level target: held in a tractor ring. */
    marked?: boolean
    /** Draw the glow around the orb (off for small copies). */
    halo?: boolean
  }>(),
  { symbols: true, marked: false, halo: true },
)

/** Glyphs of the six colours, centred on 0 0, about 0.4 wide. */
const GLYPHS = [
  'M0 -0.16 A0.16 0.16 0 1 1 0 0.16 A0.16 0.16 0 1 1 0 -0.16 Z M0 -0.075 A0.075 0.075 0 1 0 0 0.075 A0.075 0.075 0 1 0 0 -0.075 Z',
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

/** Six wedges of the prism orb. */
const WEDGES = Array.from({ length: 6 }, (_, i) => {
  const r = 0.46
  const a0 = (Math.PI / 3) * i - Math.PI / 2
  const a1 = a0 + Math.PI / 3
  const p = (a: number) => `${(Math.cos(a) * r).toFixed(3)} ${(Math.sin(a) * r).toFixed(3)}`
  return { d: `M0 0 L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z`, color: ORB_COLORS[i]!.main }
})

/** Spikes of the nova mine. */
const SPIKES = Array.from({ length: 8 }, (_, i) => {
  const a = (Math.PI / 4) * i
  const c = Math.cos(a)
  const s = Math.sin(a)
  return `M${(c * 0.36).toFixed(3)} ${(s * 0.36).toFixed(3)} L${(c * 0.5).toFixed(3)} ${(s * 0.5).toFixed(3)}`
})

const kind = computed(() =>
  isColor(props.value)
    ? 'color'
    : props.value === STONE
      ? 'stone'
      : props.value === BOMB
        ? 'bomb'
        : props.value === RAINBOW
          ? 'rainbow'
          : 'none',
)

const palette = computed(() => (isColor(props.value) ? ORB_COLORS[props.value]! : null))
</script>

<template>
  <g class="bubble" :class="`bubble--${kind}`" :transform="`translate(${x.toFixed(3)} ${y.toFixed(3)})`">
    <template v-if="kind === 'color' && palette">
      <circle v-if="halo" r="0.64" :fill="`url(#${ids}-halo-${value})`" />
      <circle r="0.47" :fill="`url(#${ids}-orb-${value})`" />
      <circle class="bubble__rim" r="0.44" :stroke="palette.light" />
      <path class="bubble__energy" d="M0.3 0.2 A0.36 0.36 0 0 1 -0.08 0.36" :stroke="palette.light" />
      <path
        v-if="symbols"
        class="bubble__glyph"
        :d="GLYPHS[value]"
        :fill="palette.light"
        :stroke="palette.deep"
      />
      <circle r="0.47" :fill="`url(#${ids}-spec)`" />
    </template>

    <template v-else-if="kind === 'stone'">
      <path
        class="bubble__rock"
        d="M-0.12 -0.46 L0.2 -0.43 L0.4 -0.24 L0.47 0.06 L0.36 0.33 L0.1 0.47 L-0.22 0.43 L-0.42 0.24 L-0.47 -0.06 L-0.36 -0.32 Z"
        :fill="`url(#${ids}-rock)`"
      />
      <circle class="bubble__crater" cx="-0.15" cy="-0.12" r="0.11" />
      <circle class="bubble__crater" cx="0.18" cy="0.14" r="0.08" />
      <circle class="bubble__crater" cx="-0.05" cy="0.25" r="0.05" />
    </template>

    <template v-else-if="kind === 'bomb'">
      <circle v-if="halo" class="bubble__mine-halo" r="0.66" />
      <path class="bubble__spikes" :d="SPIKES.join(' ')" />
      <circle r="0.38" :fill="`url(#${ids}-mine)`" class="bubble__mine" />
      <circle r="0.27" class="bubble__mine-ring" />
      <circle r="0.13" class="bubble__mine-light" />
      <circle r="0.38" :fill="`url(#${ids}-spec)`" />
    </template>

    <template v-else-if="kind === 'rainbow'">
      <circle v-if="halo" r="0.66" class="bubble__prism-halo" />
      <g class="bubble__prism">
        <path v-for="wedge in WEDGES" :key="wedge.d" :d="wedge.d" :fill="wedge.color" />
      </g>
      <circle r="0.3" :fill="`url(#${ids}-core)`" />
      <circle r="0.47" :fill="`url(#${ids}-spec)`" />
    </template>

    <g v-if="marked" class="bubble__tractor">
      <circle r="0.5" class="bubble__tractor-glow" />
      <circle r="0.5" class="bubble__tractor-ring" />
    </g>
  </g>
</template>

<style scoped>
.bubble__rim {
  fill: none;
  stroke-width: 0.025;
  stroke-opacity: 0.55;
}

.bubble__energy {
  fill: none;
  stroke-width: 0.05;
  stroke-linecap: round;
  stroke-opacity: 0.75;
}

.bubble__glyph {
  stroke-width: 0.03;
  fill-rule: evenodd;
}

.bubble__rock {
  stroke: #2a2424;
  stroke-width: 0.03;
  stroke-linejoin: round;
}

.bubble__crater {
  fill: rgb(0 0 0 / 28%);
  stroke: rgb(255 255 255 / 18%);
  stroke-width: 0.015;
}

.bubble__mine-halo {
  fill: rgb(255 70 40 / 22%);
}

.bubble__spikes {
  stroke: #9aa3c4;
  stroke-width: 0.07;
  stroke-linecap: round;
}

.bubble__mine {
  stroke: #05060f;
  stroke-width: 0.03;
}

.bubble__mine-ring {
  fill: none;
  stroke: #ff5a3c;
  stroke-width: 0.035;
  stroke-dasharray: 0.12 0.06;
}

.bubble__mine-light {
  fill: #ff3b2f;
  animation: blink 0.9s ease-in-out infinite alternate;
}

.bubble__prism-halo {
  fill: rgb(255 255 255 / 18%);
}

.bubble__prism {
  transform-box: fill-box;
  transform-origin: center;
  animation: spin 6s linear infinite;
}

.bubble__tractor-glow {
  fill: none;
  stroke: #7ff6ff;
  stroke-opacity: 0.35;
  stroke-width: 0.12;
}

.bubble__tractor-ring {
  fill: none;
  stroke: #e9fdff;
  stroke-width: 0.045;
  stroke-dasharray: 0.2 0.11;
  transform-box: fill-box;
  transform-origin: center;
  animation: spin 5s linear infinite;
}

@keyframes blink {
  to {
    fill: #ffd23f;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

:root[data-motion='reduced'] .bubble * {
  animation: none;
}
</style>
