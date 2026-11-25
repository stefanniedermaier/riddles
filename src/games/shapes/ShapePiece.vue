<script setup lang="ts">
import { ITEM_KIND, type Special } from './logic/types'
import { ensurePieceDefs } from './pieceDefs'

/**
 * One game piece as inline SVG (viewBox 0–100): glossy fruit and garden motifs. Every kind
 * has its own colour *and* silhouette, so pieces can be told apart without colour vision:
 *
 * 0 strawberry · 1 orange · 2 lemon · 3 leaf · 4 flower · 5 grapes
 *
 * The shading comes from shared gradients (see `pieceDefs.ts`): a light spot top left, a
 * darker rim, a dark outline and a white gloss highlight – a "candy" look that stays crisp
 * at small sizes.
 *
 * Specials are drawn on top of the piece: a rocket (clears a row or column), a bomb
 * (clears the area around it) and a rainbow ball (prism, clears one kind).
 */
defineProps<{ kind: number; special: Special }>()

ensurePieceDefs()

/** Grapes: centres of the berries, back to front. */
const GRAPES: [number, number][] = [
  [31, 42],
  [52, 39],
  [72, 43],
  [41, 59],
  [62, 60],
  [51, 77],
]

/** Flower petals: five rotations around the centre. */
const PETALS = Array.from({ length: 5 }, (_, i) => i * 72)

/** Strawberry seeds. */
const SEEDS: [number, number, number][] = [
  [34, 46, -20],
  [50, 43, 0],
  [66, 46, 20],
  [42, 59, -15],
  [58, 59, 15],
  [50, 74, 0],
  [29, 61, -30],
  [71, 61, 30],
]

/** Orange peel pores. */
const PORES: [number, number][] = [
  [62, 66],
  [70, 55],
  [55, 77],
  [40, 72],
  [68, 73],
  [30, 62],
  [48, 66],
]

/** Rainbow ball wedges (prism). */
const WEDGES = Array.from({ length: 6 }, (_, i) => {
  const a0 = -Math.PI / 2 + (i * Math.PI) / 3
  const a1 = a0 + Math.PI / 3
  const p = (a: number) => `${(50 + 40 * Math.cos(a)).toFixed(1)} ${(50 + 40 * Math.sin(a)).toFixed(1)}`
  return `M50 50L${p(a0)}A40 40 0 0 1 ${p(a1)}Z`
})
</script>

<template>
  <svg
    class="shape-piece"
    :class="[`shape-piece--k${kind}`, `shape-piece--${special}`]"
    viewBox="0 0 100 100"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Drop item (levels): an acorn with a small arrow – it has to reach the bottom. -->
    <template v-if="kind === ITEM_KIND">
      <ellipse cx="50" cy="94" rx="22" ry="4" class="ground" />
      <path d="M25 46Q25 86 50 93Q75 86 75 46Z" class="item__nut" />
      <path d="M32 54Q34 70 40 78" class="gloss-line" />
      <path d="M19 47Q21 23 50 21Q79 23 81 47Q50 56 19 47Z" class="item__cap" />
      <path d="M30 36Q50 30 70 36M25 44Q50 38 75 44" class="item__cap-lines" />
      <path d="M50 21Q50 11 58 7" class="item__stem" />
      <ellipse cx="38" cy="30" rx="9" ry="4" transform="rotate(-12 38 30)" class="gloss" />
      <g class="item__arrow">
        <!-- The shadow is a second stroke instead of a drop-shadow filter on a moving path. -->
        <path d="M50 59V77M42 70l8 8 8-8" class="item__arrow-shadow" />
        <path d="M50 58V76M42 69l8 8 8-8" />
      </g>
    </template>

    <!-- Prism: a rainbow ball that clears every piece of one kind. -->
    <template v-else-if="special === 'prism'">
      <ellipse cx="50" cy="95" rx="26" ry="4" class="ground" />
      <g class="prism">
        <circle cx="50" cy="50" r="45" class="prism__ring" />
        <g class="prism__wheel">
          <path v-for="(d, i) in WEDGES" :key="i" :d="d" :class="`wedge-${i}`" />
        </g>
        <circle cx="50" cy="50" r="40" class="prism__orb" />
        <path
          d="M50 29l5.8 13.2L70 43.6l-10 9L62.6 67 50 59.8 37.4 67l2.6-14.4-10-9 14.2-1.4z"
          class="prism__star"
        />
        <ellipse cx="35" cy="26" rx="13" ry="6" transform="rotate(-30 35 26)" class="gloss" />
        <circle cx="70" cy="70" r="2.5" class="sparkle" />
      </g>
    </template>

    <template v-else>
      <ellipse cx="50" cy="94" rx="25" ry="4.5" class="ground" />
      <g class="fruit" :class="{ 'fruit--under': special !== 'none' }">
        <!-- 0 Strawberry -->
        <template v-if="kind === 0">
          <path
            d="M50 93C27 87 11 63 14 44C16 29 33 24 50 30C67 24 84 29 86 44C89 63 73 87 50 93Z"
            class="body body--0"
          />
          <g v-for="([x, y, r], i) in SEEDS" :key="i" :transform="`rotate(${r} ${x} ${y})`">
            <ellipse :cx="x" :cy="y + 0.8" rx="3" ry="4.2" class="seed__pit" />
            <ellipse :cx="x" :cy="y" rx="1.8" ry="2.9" class="seed" />
          </g>
          <path
            d="M22 33Q30 18 42 27Q46 12 50 12Q54 12 58 27Q70 18 78 33Q66 34 60 38Q50 44 40 38Q34 34 22 33Z"
            class="calyx"
          />
          <path d="M50 26V10" class="stem" />
          <ellipse cx="30" cy="48" rx="6.5" ry="12" transform="rotate(-24 30 48)" class="gloss" />
          <circle cx="38" cy="64" r="2" class="sparkle" />
        </template>

        <!-- 1 Orange -->
        <template v-else-if="kind === 1">
          <circle cx="50" cy="56" r="36" class="body body--1" />
          <circle v-for="([x, y], i) in PORES" :key="i" :cx="x" :cy="y" r="1.5" class="pore" />
          <path d="M45 22Q50 25 55 22" class="navel" />
          <path d="M50 22V13" class="stem" />
          <path d="M52 19Q60 2 82 9Q73 27 52 19Z" class="leaf" />
          <path d="M55 18Q67 11 77 10" class="leaf-vein" />
          <ellipse cx="35" cy="40" rx="12" ry="7" transform="rotate(-38 35 40)" class="gloss" />
          <circle cx="27" cy="57" r="2.2" class="sparkle" />
        </template>

        <!-- 2 Lemon -->
        <template v-else-if="kind === 2">
          <g transform="rotate(-28 50 54)">
            <path
              d="M12 54Q8 48 17 45Q29 26 50 26Q71 26 83 45Q92 48 88 54Q92 60 83 63Q71 82 50 82Q29 82 17 63Q8 60 12 54Z"
              class="body body--2"
            />
            <ellipse cx="36" cy="40" rx="14" ry="5.5" class="gloss" />
            <circle cx="28" cy="52" r="2" class="sparkle" />
          </g>
          <path d="M68 22Q80 8 94 14Q86 30 68 22Z" class="leaf" />
          <path d="M71 21Q81 15 90 15" class="leaf-vein" />
        </template>

        <!-- 3 Leaf -->
        <template v-else-if="kind === 3">
          <g transform="rotate(32 50 50)">
            <path d="M50 5C82 24 86 63 50 92C14 63 18 24 50 5Z" class="body body--3" />
            <path d="M50 14V97" class="midrib" />
            <path
              d="M50 36L64 26M50 52L68 42M50 68L64 60M50 44L36 34M50 60L32 50M50 76L38 68"
              class="vein"
            />
            <ellipse cx="37" cy="38" rx="5" ry="14" class="gloss" />
          </g>
          <circle cx="40" cy="70" r="2" class="sparkle" />
        </template>

        <!-- 4 Flower -->
        <template v-else-if="kind === 4">
          <g v-for="angle in PETALS" :key="angle" :transform="`rotate(${angle} 50 53)`">
            <ellipse cx="50" cy="30" rx="15" ry="19" class="body body--4" />
            <ellipse cx="46" cy="22" rx="4" ry="7" transform="rotate(-15 46 22)" class="gloss" />
          </g>
          <circle cx="50" cy="53" r="13" class="flower__core" />
          <circle cx="46" cy="50" r="1.8" class="flower__dot" />
          <circle cx="54" cy="50" r="1.8" class="flower__dot" />
          <circle cx="50" cy="57" r="1.8" class="flower__dot" />
          <ellipse cx="45" cy="47" rx="5" ry="3" class="gloss" />
        </template>

        <!-- 5 Grapes -->
        <template v-else>
          <path d="M52 32V12" class="stem" />
          <path d="M54 19Q66 2 88 10Q78 28 54 19Z" class="leaf" />
          <path d="M57 18Q71 11 83 11" class="leaf-vein" />
          <template v-for="([x, y], i) in GRAPES" :key="i">
            <circle :cx="x" :cy="y" r="12.5" class="body body--5" />
            <ellipse :cx="x - 4.5" :cy="y - 5" rx="4" ry="2.6" :transform="`rotate(-35 ${x - 4.5} ${y - 5})`" class="gloss" />
          </template>
        </template>
      </g>

      <!-- Rocket: clears a row (line-h) or a column (line-v). -->
      <g
        v-if="special === 'line-h' || special === 'line-v'"
        class="rocket"
        :transform="special === 'line-v' ? 'rotate(-90 50 50)' : undefined"
      >
        <path d="M24 50Q8 40 2 50Q8 60 24 50Z" class="rocket__flame" />
        <path d="M24 50Q15 45 10 50Q15 55 24 50Z" class="rocket__flame-core" />
        <path d="M34 38L23 23H38L47 38ZM34 62L23 77H38L47 62Z" class="rocket__fin" />
        <path d="M24 38H66Q84 38 95 50Q84 62 66 62H24Z" class="rocket__body" />
        <path d="M78 40.5Q89 44 95 50Q89 56 78 59.5Z" class="rocket__nose" />
        <circle cx="60" cy="50" r="7" class="rocket__window" />
        <circle cx="58" cy="48" r="2.2" class="sparkle" />
        <path d="M30 42.5H62" class="rocket__shine" />
      </g>

      <!-- Bomb: clears the area around it. -->
      <g v-else-if="special === 'burst'" class="bomb">
        <circle cx="54" cy="60" r="27" class="bomb__body" />
        <rect x="61" y="27" width="15" height="11" rx="2.5" transform="rotate(35 68.5 32.5)" class="bomb__cap" />
        <path d="M73 29Q78 17 88 15" class="bomb__fuse" />
        <path
          d="M89 6l2.4 6.2 6.6.4-5.1 4.2 1.7 6.4L89 19.6l-5.6 3.6 1.7-6.4L80 12.6l6.6-.4z"
          class="bomb__spark"
        />
        <ellipse cx="42" cy="48" rx="8" ry="12" transform="rotate(40 42 48)" class="gloss" />
      </g>
    </template>
  </svg>
</template>

<style scoped>
.shape-piece {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* --- Shared shading ------------------------------------------------------------ */

.body {
  stroke-width: 2.6;
  stroke-linejoin: round;
}

.body--0 { fill: url(#sp-red); stroke: #7d0718; }
.body--1 { fill: url(#sp-orange); stroke: #9c4100; }
.body--2 { fill: url(#sp-yellow); stroke: #a87a00; }
.body--3 { fill: url(#sp-green); stroke: #0b5a20; }
.body--4 { fill: url(#sp-blue); stroke: #0f378f; }
.body--5 { fill: url(#sp-purple); stroke: #430a80; }

.fruit {
  transform-origin: 50% 50%;
}

/* A soft contact shadow under every piece (cheaper than a filter on 64 pieces). */
.ground {
  fill: rgb(30 20 10 / 30%);
}

/* Under a rocket or bomb the fruit stays recognisable but steps back a little. */
.fruit--under {
  transform: scale(0.88);
  opacity: 0.9;
}

.gloss {
  fill: url(#sp-gloss);
}

.gloss-line {
  fill: none;
  stroke: rgb(255 255 255 / 55%);
  stroke-width: 4;
  stroke-linecap: round;
}

.sparkle {
  fill: #fff;
  opacity: 0.9;
}

.stem {
  fill: none;
  stroke: #6b3d14;
  stroke-width: 5;
  stroke-linecap: round;
}

.leaf,
.calyx {
  fill: url(#sp-leaf);
  stroke: #145f24;
  stroke-width: 2.2;
  stroke-linejoin: round;
}

.leaf-vein {
  fill: none;
  stroke: rgb(220 255 190 / 70%);
  stroke-width: 1.8;
  stroke-linecap: round;
}

/* Strawberry */
.seed {
  fill: #fff1b0;
}

.seed__pit {
  fill: rgb(110 0 20 / 35%);
}

/* Orange */
.pore {
  fill: rgb(150 60 0 / 22%);
}

.navel {
  fill: none;
  stroke: rgb(120 50 0 / 45%);
  stroke-width: 2;
  stroke-linecap: round;
}

/* Leaf */
.midrib {
  fill: none;
  stroke: #d4ff9e;
  stroke-width: 3.4;
  stroke-linecap: round;
  opacity: 0.85;
}

.vein {
  fill: none;
  stroke: #b8f58a;
  stroke-width: 2;
  stroke-linecap: round;
  opacity: 0.7;
}

/* Flower */
.flower__core {
  fill: url(#sp-gold);
  stroke: #b35f00;
  stroke-width: 2.4;
}

.flower__dot {
  fill: #b35f00;
  opacity: 0.55;
}

/* --- Drop item (acorn) ----------------------------------------------------------- */

.item__nut {
  fill: url(#sp-acorn);
  stroke: #5e3510;
  stroke-width: 2.6;
  stroke-linejoin: round;
}

.item__cap {
  fill: url(#sp-cap);
  stroke: #2d1806;
  stroke-width: 2.6;
  stroke-linejoin: round;
}

.item__cap-lines {
  fill: none;
  stroke: #3a2009;
  stroke-width: 2.2;
  stroke-linecap: round;
  opacity: 0.7;
}

.item__stem {
  fill: none;
  stroke: #3a2009;
  stroke-width: 5;
  stroke-linecap: round;
}

.item__arrow-shadow {
  stroke: #5e3510;
}

.item__arrow {
  fill: none;
  stroke: #fff;
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
  animation: arrow-bob 1.1s ease-in-out infinite;
}

@keyframes arrow-bob {
  50% {
    transform: translateY(5px);
  }
}

/* --- Rocket -------------------------------------------------------------------- */

.rocket__body {
  fill: url(#sp-metal);
  stroke: #232b40;
  stroke-width: 3.2;
  stroke-linejoin: round;
}

.rocket__nose,
.rocket__fin {
  fill: url(#sp-rocket-red);
  stroke: #232b40;
  stroke-width: 3;
  stroke-linejoin: round;
}

.rocket__window {
  fill: #59c8ff;
  stroke: #232b40;
  stroke-width: 3.2;
}

.rocket__shine {
  fill: none;
  stroke: #fff;
  stroke-width: 3;
  stroke-linecap: round;
  opacity: 0.9;
}

.rocket__flame {
  fill: #ff7a00;
  transform-origin: 24px 50px;
  animation: flame 0.35s ease-in-out infinite alternate;
}

.rocket__flame-core {
  fill: #ffe14d;
  transform-origin: 24px 50px;
  animation: flame 0.25s ease-in-out infinite alternate-reverse;
}

/* --- Bomb ---------------------------------------------------------------------- */

.bomb__body {
  fill: url(#sp-bomb);
  stroke: #07080c;
  stroke-width: 3;
}

.bomb__cap {
  fill: #6b7284;
  stroke: #07080c;
  stroke-width: 2.5;
}

.bomb__fuse {
  fill: none;
  stroke: #d9b07a;
  stroke-width: 4;
  stroke-linecap: round;
}

.bomb__spark {
  fill: #ffd21a;
  stroke: #ff6a00;
  stroke-width: 2;
  stroke-linejoin: round;
  transform-origin: 89px 15px;
  animation: spark 0.45s ease-in-out infinite alternate;
}

/* --- Prism (rainbow ball) ------------------------------------------------------- */

.prism__ring {
  fill: #fff;
  stroke: #3a2f55;
  stroke-width: 3;
}

.prism__wheel {
  transform-origin: 50px 50px;
  animation: spin 4s linear infinite;
}

.wedge-0 { fill: #f2263f; }
.wedge-1 { fill: #ff9412; }
.wedge-2 { fill: #ffd61f; }
.wedge-3 { fill: #2fbd4f; }
.wedge-4 { fill: #3584ff; }
.wedge-5 { fill: #a24bf5; }

.prism__orb {
  fill: url(#sp-orb);
}

.prism__star {
  fill: #fff;
  stroke: #3a2f55;
  stroke-width: 2.2;
  stroke-linejoin: round;
}

@keyframes flame {
  from {
    transform: scaleX(0.75);
  }
  to {
    transform: scaleX(1.2);
  }
}

@keyframes spark {
  from {
    transform: scale(0.8) rotate(0deg);
  }
  to {
    transform: scale(1.2) rotate(25deg);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

:root[data-still] .item__arrow,
:root[data-still] .rocket__flame,
:root[data-still] .rocket__flame-core,
:root[data-still] .bomb__spark,
:root[data-still] .prism__wheel {
  animation-play-state: paused;
}

:root[data-motion='reduced'] .item__arrow,
:root[data-motion='reduced'] .rocket__flame,
:root[data-motion='reduced'] .rocket__flame-core,
:root[data-motion='reduced'] .bomb__spark,
:root[data-motion='reduced'] .prism__wheel {
  animation: none;
}
</style>
