<script setup lang="ts">
import { useGameAccent } from '@/core/gameAccent'
import { createRng } from '@/core/rng'

/**
 * The space scene behind Bubbles (lobby and play view): a deep sky with nebulae, two layers
 * of twinkling stars, a ringed planet, a small moon, a shooting star now and then and a
 * glowing grid floor on the horizon. Lighter "orbit at dawn" colours in the light theme,
 * deep space in the dark one.
 *
 * Built from layers that adapt to any screen: sky and nebulae are CSS gradients, the stars
 * are an SVG that covers the viewport (`slice`), the grid floor stretches to the width.
 * Purely decorative and fixed behind the page; no motion with reduced motion.
 */
useGameAccent(() => 'bubbles')

/** Fixed star positions (seeded), in % of the screen. */
function stars(seed: number, count: number, max: number) {
  const rng = createRng(seed)
  return Array.from({ length: count }, () => ({
    x: rng.next() * 100,
    y: rng.next() * 72,
    r: 0.08 + rng.next() * max,
  }))
}

const FAR = stars(11, 70, 0.12)
const NEAR = stars(23, 26, 0.2)

/** Perspective lines of the grid floor (x at the horizon → x at the bottom, in %). */
const RAYS = Array.from({ length: 13 }, (_, i) => {
  const top = 50 + (i - 6) * 7
  const bottom = 50 + (i - 6) * 34
  return `M${top} 0 L${bottom} 100`
})
/** Horizontal lines, closer together towards the horizon. */
const LINES = Array.from({ length: 7 }, (_, i) => ((i + 1) / 7) ** 1.9 * 100)
</script>

<template>
  <div class="space" aria-hidden="true">
    <div class="space__sky" />
    <div class="space__nebula" />

    <svg class="space__stars" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <g class="stars stars--far">
        <circle v-for="(s, i) in FAR" :key="i" :cx="s.x" :cy="s.y" :r="s.r" />
      </g>
      <g class="stars stars--near">
        <g v-for="(s, i) in NEAR" :key="i" :transform="`translate(${s.x} ${s.y})`">
          <circle :r="s.r" />
          <path v-if="i % 4 === 0" :d="`M${-s.r * 4} 0H${s.r * 4}M0 ${-s.r * 4}V${s.r * 4}`" class="stars__flare" />
        </g>
      </g>
    </svg>

    <div class="space__shooting" />

    <svg class="space__planet" viewBox="0 0 200 200">
      <defs>
        <radialGradient id="space-planet" cx="0.35" cy="0.32" r="0.75">
          <stop offset="0" class="planet__light" />
          <stop offset="0.55" class="planet__mid" />
          <stop offset="1" class="planet__dark" />
        </radialGradient>
        <linearGradient id="space-ring" x1="0" x2="1">
          <stop offset="0" stop-color="#fff" stop-opacity="0" />
          <stop offset="0.3" stop-color="#ffe7b8" stop-opacity="0.85" />
          <stop offset="0.7" stop-color="#ffc58a" stop-opacity="0.6" />
          <stop offset="1" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
        <clipPath id="space-ring-back">
          <rect x="0" y="0" width="200" height="100" />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="100" rx="92" ry="20" fill="none" stroke="url(#space-ring)" stroke-width="9" transform="rotate(-16 100 100)" clip-path="url(#space-ring-back)" />
      <circle cx="100" cy="100" r="54" fill="url(#space-planet)" />
      <path d="M52 86 Q100 74 148 92" class="planet__band" />
      <path d="M50 108 Q100 98 150 114" class="planet__band planet__band--thin" />
      <ellipse cx="100" cy="100" rx="92" ry="20" fill="none" stroke="url(#space-ring)" stroke-width="9" transform="rotate(-16 100 100)" clip-path="url(#space-ring-front)" class="planet__ring-front" />
      <clipPath id="space-ring-front">
        <rect x="0" y="100" width="200" height="100" />
      </clipPath>
    </svg>

    <svg class="space__moon" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" class="moon" />
      <circle cx="14" cy="16" r="3.4" class="moon__crater" />
      <circle cx="25" cy="25" r="4.4" class="moon__crater" />
      <circle cx="24" cy="12" r="2" class="moon__crater" />
    </svg>

    <svg class="space__floor" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="space-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" class="floor__top" />
          <stop offset="1" class="floor__bottom" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#space-floor)" />
      <g class="floor__grid">
        <path v-for="(d, i) in RAYS" :key="`r${i}`" :d="d" vector-effect="non-scaling-stroke" />
        <path v-for="(y, i) in LINES" :key="`l${i}`" :d="`M0 ${y} H100`" vector-effect="non-scaling-stroke" />
      </g>
      <path d="M0 0.4 H100" class="floor__horizon" vector-effect="non-scaling-stroke" />
    </svg>
  </div>
</template>

<style scoped>
.space {
  --sky-top: #1b1f5e;
  --sky-mid: #3d3aa6;
  --sky-low: #8f7fe0;
  --nebula-a: rgb(255 92 200 / 38%);
  --nebula-b: rgb(64 220 255 / 30%);
  --star: #fff;
  --planet-light: #ffd9a1;
  --planet-mid: #f08a5d;
  --planet-dark: #7a2e5c;
  --moon: #d9dcf2;
  --floor-top: #3b2b8f;
  --floor-bottom: #14123f;
  --grid: rgb(255 120 220 / 55%);
  --horizon: #ff8ae0;

  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

:root[data-theme='dark'] .space {
  --sky-top: #03040f;
  --sky-mid: #0a0f2e;
  --sky-low: #1d1550;
  --nebula-a: rgb(190 60 255 / 30%);
  --nebula-b: rgb(0 200 255 / 22%);
  --planet-light: #9ee7ff;
  --planet-mid: #3d7bd9;
  --planet-dark: #1b1f5e;
  --moon: #8d91b0;
  --floor-top: #160f40;
  --floor-bottom: #04040f;
  --grid: rgb(0 229 255 / 45%);
  --horizon: #33e1ff;
}

.space__sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--sky-top) 0%, var(--sky-mid) 45%, var(--sky-low) 74%);
}

.space__nebula {
  position: absolute;
  inset: -10%;
  background:
    radial-gradient(ellipse 55% 35% at 18% 28%, var(--nebula-a), transparent 70%),
    radial-gradient(ellipse 45% 30% at 82% 55%, var(--nebula-b), transparent 70%),
    radial-gradient(ellipse 30% 22% at 60% 12%, var(--nebula-a), transparent 75%);
  animation: nebula 40s ease-in-out infinite alternate;
}

.space__stars {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.stars circle {
  fill: var(--star);
}

.stars--far {
  opacity: 0.65;
  animation: twinkle 4.5s ease-in-out infinite alternate;
}

.stars--near {
  animation: twinkle 3s ease-in-out -1.5s infinite alternate;
}

.stars__flare {
  stroke: var(--star);
  stroke-width: 0.05;
  opacity: 0.7;
}

.space__shooting {
  position: absolute;
  top: 14%;
  left: 70%;
  width: 120px;
  height: 2px;
  background: linear-gradient(90deg, #fff, transparent);
  border-radius: 2px;
  opacity: 0;
  transform: rotate(-24deg);
  animation: shoot 9s ease-in 3s infinite;
}

.space__planet {
  position: absolute;
  top: max(52px, 7vh);
  right: -40px;
  width: min(46vw, 230px);
  animation: drift 26s ease-in-out infinite alternate;
}

.planet__light {
  stop-color: var(--planet-light);
}

.planet__mid {
  stop-color: var(--planet-mid);
}

.planet__dark {
  stop-color: var(--planet-dark);
}

.planet__band {
  fill: none;
  stroke: rgb(255 255 255 / 22%);
  stroke-width: 7;
  stroke-linecap: round;
}

.planet__band--thin {
  stroke-width: 3;
  stroke: rgb(0 0 0 / 16%);
}

.space__moon {
  position: absolute;
  top: 38%;
  left: 5%;
  width: min(10vw, 48px);
  opacity: 0.9;
  animation: drift 18s ease-in-out -6s infinite alternate;
}

.moon {
  fill: var(--moon);
}

.moon__crater {
  fill: rgb(0 0 0 / 14%);
}

.space__floor {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 24vh;
}

.floor__top {
  stop-color: var(--floor-top);
}

.floor__bottom {
  stop-color: var(--floor-bottom);
}

.floor__grid path {
  fill: none;
  stroke: var(--grid);
  stroke-width: 1;
}

.floor__horizon {
  stroke: var(--horizon);
  stroke-width: 2;
  filter: drop-shadow(0 0 4px var(--horizon));
}

@keyframes twinkle {
  to {
    opacity: 0.35;
  }
}

@keyframes nebula {
  to {
    transform: translate(3%, -2%) scale(1.06);
  }
}

@keyframes drift {
  to {
    transform: translate(-10px, 8px);
  }
}

@keyframes shoot {
  0% {
    opacity: 0;
    transform: rotate(-24deg) translateX(0);
  }

  2% {
    opacity: 1;
  }

  8%,
  100% {
    opacity: 0;
    transform: rotate(-24deg) translateX(-60vw);
  }
}

:root[data-motion='reduced'] .space * {
  animation: none !important;
}

:root[data-motion='reduced'] .space__shooting {
  display: none;
}
</style>
