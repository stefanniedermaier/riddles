<script setup lang="ts">
import { useGameAccent } from '@/core/gameAccent'

/**
 * The garden scene behind the Shapes board: sky, sun (moon in dark mode), drifting clouds,
 * rolling hills, a picket fence, bushes in the corners and a flower bed in front.
 *
 * Built from layers so it adapts to any screen: the sky is a CSS gradient, the hills are
 * stretched to the full width (soft curves survive that), fence and flower bed repeat
 * horizontally, and the bushes keep their aspect ratio in the bottom corners.
 * Purely decorative and fixed behind the page.
 */
useGameAccent(() => 'shapes')

const FLOWERS = [
  { x: 6, y: 34, c: '#ff6fa0' },
  { x: 22, y: 26, c: '#ffd23f' },
  { x: 38, y: 36, c: '#ffffff' },
  { x: 54, y: 24, c: '#ff8a3d' },
  { x: 70, y: 34, c: '#c58cff' },
  { x: 86, y: 27, c: '#ff6fa0' },
  { x: 98, y: 38, c: '#ffd23f' },
]

const BUSH_FLOWERS = [
  { x: 40, y: 70, c: '#ff6fa0' },
  { x: 70, y: 40, c: '#ffffff' },
  { x: 100, y: 78, c: '#ffd23f' },
  { x: 120, y: 52, c: '#ff6fa0' },
  { x: 55, y: 100, c: '#ffffff' },
  { x: 150, y: 96, c: '#c58cff' },
  { x: 25, y: 110, c: '#ffd23f' },
]
</script>

<template>
  <div class="garden" aria-hidden="true">
    <div class="garden__sky" />
    <div class="garden__sun" />

    <svg class="garden__cloud garden__cloud--a" viewBox="0 0 120 50">
      <path d="M14 42Q2 42 4 32Q6 22 20 24Q24 8 42 10Q56 0 70 12Q86 6 92 20Q112 18 114 32Q116 44 100 42Z" />
    </svg>
    <svg class="garden__cloud garden__cloud--b" viewBox="0 0 120 50">
      <path d="M14 42Q2 42 4 32Q6 22 20 24Q24 8 42 10Q56 0 70 12Q86 6 92 20Q112 18 114 32Q116 44 100 42Z" />
    </svg>
    <svg class="garden__cloud garden__cloud--c" viewBox="0 0 120 50">
      <path d="M14 42Q2 42 4 32Q6 22 20 24Q24 8 42 10Q56 0 70 12Q86 6 92 20Q112 18 114 32Q116 44 100 42Z" />
    </svg>

    <svg class="garden__hills" viewBox="0 0 400 300" preserveAspectRatio="none">
      <path d="M0 70Q60 20 130 52Q200 84 270 40Q340 0 400 46V300H0Z" class="hill hill--far" />
      <path d="M0 110Q80 64 170 98Q260 132 330 86Q370 62 400 80V300H0Z" class="hill hill--mid" />
      <path d="M0 160Q100 120 210 150Q310 176 400 136V300H0Z" class="hill hill--near" />
    </svg>

    <svg class="garden__fence">
      <defs>
        <pattern id="garden-picket" width="24" height="46" patternUnits="userSpaceOnUse">
          <rect x="0" y="15" width="24" height="6" class="fence__shade" />
          <rect x="0" y="31" width="24" height="6" class="fence__shade" />
          <path d="M6 8L12 2L18 8V46H6Z" class="fence__picket" />
          <rect x="0" y="14" width="24" height="5" class="fence__rail" />
          <rect x="0" y="30" width="24" height="5" class="fence__rail" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#garden-picket)" />
    </svg>
    <div class="garden__lawn" />

    <svg class="garden__bush garden__bush--left" viewBox="0 0 180 150">
      <circle cx="30" cy="110" r="44" class="bush bush--dark" />
      <circle cx="80" cy="80" r="50" class="bush" />
      <circle cx="130" cy="112" r="40" class="bush bush--dark" />
      <circle cx="50" cy="64" r="34" class="bush bush--light" />
      <circle cx="105" cy="58" r="28" class="bush bush--light" />
      <circle v-for="(f, i) in BUSH_FLOWERS" :key="i" :cx="f.x" :cy="f.y" r="6" :fill="f.c" class="bush__flower" />
    </svg>
    <svg class="garden__bush garden__bush--right" viewBox="0 0 180 150">
      <circle cx="30" cy="110" r="44" class="bush bush--dark" />
      <circle cx="80" cy="80" r="50" class="bush" />
      <circle cx="130" cy="112" r="40" class="bush bush--dark" />
      <circle cx="50" cy="64" r="34" class="bush bush--light" />
      <circle cx="105" cy="58" r="28" class="bush bush--light" />
      <circle v-for="(f, i) in BUSH_FLOWERS" :key="i" :cx="f.x" :cy="f.y" r="6" :fill="f.c" class="bush__flower" />
    </svg>

    <div class="garden__bed">
      <svg class="garden__bed-tile" viewBox="0 0 100 50" preserveAspectRatio="none">
        <path d="M0 50V30Q8 16 16 30Q24 12 32 28Q40 14 50 30Q60 12 68 28Q76 16 84 30Q92 14 100 30V50Z" class="bed-leaves" />
        <g v-for="(f, i) in FLOWERS" :key="i" :transform="`translate(${f.x} ${f.y})`">
          <circle r="4.2" :fill="f.c" />
          <circle r="1.6" fill="#ffb000" />
        </g>
      </svg>
    </div>

    <svg class="garden__butterfly garden__butterfly--a" viewBox="0 0 40 30">
      <g class="wings">
        <path d="M20 15Q6 -2 3 9Q2 18 20 15Z" />
        <path d="M20 15Q34 -2 37 9Q38 18 20 15Z" />
        <path d="M20 16Q8 30 6 22Q6 16 20 16Z" />
        <path d="M20 16Q32 30 34 22Q34 16 20 16Z" />
      </g>
      <rect x="19" y="8" width="2" height="14" rx="1" fill="#3b2a1a" />
    </svg>
    <svg class="garden__butterfly garden__butterfly--b" viewBox="0 0 40 30">
      <g class="wings">
        <path d="M20 15Q6 -2 3 9Q2 18 20 15Z" />
        <path d="M20 15Q34 -2 37 9Q38 18 20 15Z" />
        <path d="M20 16Q8 30 6 22Q6 16 20 16Z" />
        <path d="M20 16Q32 30 34 22Q34 16 20 16Z" />
      </g>
      <rect x="19" y="8" width="2" height="14" rx="1" fill="#3b2a1a" />
    </svg>
  </div>
</template>

<style scoped>
.garden {
  --sky-top: #6ec3ff;
  --sky-mid: #bfe6ff;
  --sky-low: #fff1cf;
  --hill-far: #a8dc86;
  --hill-mid: #79c862;
  --hill-near: #56b04a;
  --lawn: #4ea545;
  --lawn-dark: #469b3f;
  --bush: #3f9a45;
  --bush-dark: #2f7d38;
  --bush-light: #5cb85a;
  --cloud: rgb(255 255 255 / 92%);
  --fence: #fffaf0;
  --fence-shade: #d9cdb4;

  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

:root[data-theme='dark'] .garden {
  --sky-top: #0f1838;
  --sky-mid: #26326a;
  --sky-low: #5a4f86;
  --hill-far: #2d4a52;
  --hill-mid: #24413f;
  --hill-near: #1d3a33;
  --lawn: #1a3a2c;
  --lawn-dark: #173527;
  --bush: #1f4a33;
  --bush-dark: #163a28;
  --bush-light: #2a5c3f;
  --cloud: rgb(190 200 240 / 22%);
  --fence: #a9a6b8;
  --fence-shade: #6e6a82;
}

.garden__sky {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, var(--sky-top) 0%, var(--sky-mid) 38%, var(--sky-low) 58%);
}

/* Sun with a soft glow; in dark mode a moon. */
.garden__sun {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 64px);
  right: 8%;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #fffbe0, #ffe066 55%, #ffc23a);
  box-shadow:
    0 0 40px 18px rgb(255 230 120 / 55%),
    0 0 120px 60px rgb(255 240 180 / 35%);
}

:root[data-theme='dark'] .garden__sun {
  width: 54px;
  height: 54px;
  background: radial-gradient(circle at 38% 38%, #ffffff, #e6e9ff 60%, #b9bfe8);
  box-shadow:
    0 0 30px 10px rgb(200 210 255 / 30%),
    0 0 90px 40px rgb(150 160 230 / 15%);
}

.garden__cloud {
  position: absolute;
  fill: var(--cloud);
  animation: drift linear infinite;
}

.garden__cloud--a {
  top: 9%;
  width: 150px;
  animation-duration: 90s;
  animation-delay: -30s;
}

.garden__cloud--b {
  top: 21%;
  width: 110px;
  opacity: 0.85;
  animation-duration: 120s;
  animation-delay: -80s;
}

.garden__cloud--c {
  top: 4%;
  width: 90px;
  opacity: 0.7;
  animation-duration: 150s;
  animation-delay: -10s;
}

.garden__hills {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 55%;
}

.hill--far { fill: var(--hill-far); }
.hill--mid { fill: var(--hill-mid); }
.hill--near { fill: var(--hill-near); }

/* A white picket fence on the near hill (an SVG pattern, one picket per tile). */
.garden__fence {
  position: absolute;
  left: 0;
  bottom: 26%;
  width: 100%;
  height: 46px;
}

.fence__picket,
.fence__rail {
  fill: var(--fence);
}

.fence__picket {
  stroke: var(--fence-shade);
  stroke-width: 1.5;
}

.fence__shade {
  fill: var(--fence-shade);
}

.garden__lawn {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 28%;
  background:
    radial-gradient(ellipse at 20% 30%, rgb(255 255 255 / 8%), transparent 50%),
    repeating-linear-gradient(100deg, var(--lawn) 0 18px, var(--lawn-dark) 18px 36px);
}

.garden__bush {
  position: absolute;
  bottom: 9%;
  width: min(46vw, 240px);
}

.garden__bush--left {
  left: -8%;
}

.garden__bush--right {
  right: -8%;
  transform: scaleX(-1);
}

.bush { fill: var(--bush); }
.bush--dark { fill: var(--bush-dark); }
.bush--light { fill: var(--bush-light); }

:root[data-theme='dark'] .bush__flower {
  opacity: 0.55;
}

.garden__bed {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  height: 11%;
  min-height: 56px;
  overflow: hidden;
}

.garden__bed-tile {
  flex: none;
  width: 100%;
  height: 100%;
}

.bed-leaves {
  fill: var(--bush-dark);
}

.garden__butterfly {
  position: absolute;
  width: 26px;
  animation: flutter-path 18s ease-in-out infinite;
}

.garden__butterfly--a {
  bottom: 20%;
  left: 12%;
  fill: #ff8fc0;
}

.garden__butterfly--b {
  bottom: 32%;
  right: 14%;
  width: 20px;
  fill: #ffd23f;
  animation-duration: 23s;
  animation-delay: -7s;
}

.wings {
  transform-origin: 20px 15px;
  animation: flap 0.28s ease-in-out infinite alternate;
}

/* Clouds and butterflies rest while a dialog is open or nobody plays (core/stillness.ts). */
:root[data-still] .garden__cloud,
:root[data-still] .garden__butterfly,
:root[data-still] .wings {
  animation-play-state: paused;
}

:root[data-theme='dark'] .garden__butterfly {
  display: none;
}

@keyframes drift {
  from {
    transform: translateX(-180px);
  }
  to {
    transform: translateX(calc(100vw + 40px));
  }
}

@keyframes flap {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0.25);
  }
}

@keyframes flutter-path {
  0%,
  100% {
    transform: translate(0, 0) rotate(-8deg);
  }
  25% {
    transform: translate(40px, -30px) rotate(10deg);
  }
  50% {
    transform: translate(10px, -60px) rotate(-4deg);
  }
  75% {
    transform: translate(-30px, -24px) rotate(6deg);
  }
}

:root[data-motion='reduced'] .garden__cloud,
:root[data-motion='reduced'] .garden__butterfly,
:root[data-motion='reduced'] .wings {
  animation: none;
}

:root[data-motion='reduced'] .garden__cloud--a {
  left: 10%;
}

:root[data-motion='reduced'] .garden__cloud--b {
  left: 55%;
}

:root[data-motion='reduced'] .garden__cloud--c {
  left: 75%;
}
</style>
