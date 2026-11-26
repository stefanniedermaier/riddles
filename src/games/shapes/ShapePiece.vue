<script setup lang="ts">
import { ITEM_KIND, type Special } from './logic/types'
import { DYNAMITE_STICKS, ROCKET_HULL, ensurePieceDefs } from './pieceDefs'

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
 * Specials keep their kind (they match with pieces of that kind), so they are drawn in the
 * colour and texture of their fruit but in their own shape: a rocket (clears a row or
 * column; it points the way it clears) and a bundle of dynamite (clears the area around
 * it). Each kind keeps a mark of its own beside the colour – seeds, pores, the lemon tip,
 * veins, petals, berries – so they still tell apart without colour vision. The rainbow ball
 * (prism, clears one kind) has no kind.
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

/** Points of a staggered grid (textures on rockets and dynamite). */
function grid(x0: number, x1: number, y0: number, y1: number, step: number): [number, number][] {
  const points: [number, number][] = []
  let row = 0
  for (let y = y0; y <= y1; y += step * 0.86, row++) {
    for (let x = x0 + (row % 2 ? step / 2 : 0); x <= x1; x += step) points.push([x, y])
  }
  return points
}

/** Rocket textures (inside the hull, nose to the right). */
const ROCKET_SEEDS = grid(24, 90, 38, 64, 11)
const ROCKET_PORES = grid(24, 90, 37, 64, 8)
const ROCKET_GRAPES: [number, number][] = [
  [28, 41], [28, 59], [44, 41], [44, 59], [60, 41], [60, 59], [76, 50], [36, 50], [52, 50], [68, 50],
]

/** Dynamite textures (across the three sticks). */
const STICK_COLUMNS = [27, 50, 73]
const DYNAMITE_SEEDS = grid(18, 86, 38, 92, 9)
const DYNAMITE_PORES = grid(16, 88, 34, 94, 7)
const DYNAMITE_FLOWERS = STICK_COLUMNS.flatMap((x, i) => [48, 84].map((y) => [x, y - (i === 1 ? 4 : 0)]))
const DYNAMITE_GRAPES = STICK_COLUMNS.flatMap((x, i) =>
  [42, 54, 82, 94].map((y, j) => [x + (j % 2 ? -4 : 4), y - (i === 1 ? 4 : 0)]),
)

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

    <!-- Rocket in the fruit's colour and texture: clears a row (line-h) or a column (line-v). -->
    <template v-else-if="special === 'line-h' || special === 'line-v'">
      <ellipse cx="50" cy="94" rx="25" ry="4.5" class="ground" />
      <g class="rocket" :transform="special === 'line-v' ? 'rotate(-90 50 50)' : undefined">
        <path d="M18 50Q4 40 -2 50Q4 60 18 50Z" class="rocket__flame" />
        <path d="M18 50Q10 45 5 50Q10 55 18 50Z" class="rocket__flame-core" />
        <!-- Fins: the strawberry's calyx, two leaves, two petals or plain fins. -->
        <path
          v-if="kind === 0"
          d="M34 35L18 16L42 30L46 22L50 34Z M34 65L18 84L42 70L46 78L50 66Z"
          class="calyx"
        />
        <path v-else-if="kind === 3" d="M30 35Q16 26 16 16Q34 18 44 34Z M30 65Q16 74 16 84Q34 82 44 66Z" class="leaf" />
        <template v-else-if="kind === 4">
          <ellipse cx="32" cy="24" rx="8" ry="13" transform="rotate(-35 32 24)" class="body body--4" />
          <ellipse cx="32" cy="76" rx="8" ry="13" transform="rotate(35 32 76)" class="body body--4" />
        </template>
        <path v-else d="M30 36L18 18H36L46 36ZM30 64L18 82H36L46 64Z" :class="`body body--${kind} rocket__fin`" />

        <path :d="ROCKET_HULL" :class="`body body--${kind}`" />
        <g clip-path="url(#sp-clip-rocket)">
          <template v-if="kind === 0">
            <g v-for="([x, y], i) in ROCKET_SEEDS" :key="i">
              <ellipse :cx="x" :cy="y + 0.8" rx="2.6" ry="3.4" class="seed__pit" />
              <ellipse :cx="x" :cy="y" rx="1.6" ry="2.5" class="seed" />
            </g>
          </template>
          <template v-else-if="kind === 1">
            <circle v-for="([x, y], i) in ROCKET_PORES" :key="i" :cx="x" :cy="y" r="1.4" class="pore" />
          </template>
          <template v-else-if="kind === 3">
            <path d="M14 50H96" class="midrib" />
            <path d="M30 50L40 36M46 50L56 36M62 50L72 38M30 50L40 64M46 50L56 64M62 50L72 62" class="vein" />
          </template>
          <template v-else-if="kind === 5">
            <circle v-for="([x, y], i) in ROCKET_GRAPES" :key="i" :cx="x" :cy="y" r="9.5" class="body body--5 berry" />
          </template>
          <ellipse cx="50" cy="39" rx="26" ry="3.6" class="gloss" />
        </g>
        <!-- The lemon's pointed tip at the nose. -->
        <path v-if="kind === 2" d="M95 46Q103 50 95 54Z" class="body body--2" />
        <!-- Porthole; the flower's is its golden core. -->
        <template v-if="kind === 4">
          <circle cx="66" cy="50" r="9" class="flower__core" />
          <circle cx="64" cy="48" r="1.6" class="flower__dot" />
          <circle cx="68.5" cy="51" r="1.6" class="flower__dot" />
        </template>
        <template v-else>
          <circle cx="66" cy="50" r="8" class="rocket__window" />
          <circle cx="64" cy="48" r="2.2" class="sparkle" />
        </template>
      </g>
    </template>

    <!-- Dynamite in the fruit's colour and texture: clears the area around it. -->
    <template v-else-if="special === 'burst'">
      <ellipse cx="50" cy="95" rx="30" ry="4.5" class="ground" />
      <g class="dynamite">
        <g clip-path="url(#sp-clip-dynamite)">
          <rect x="14" y="28" width="72" height="66" :class="`body--${kind} dynamite__fill`" />
          <template v-if="kind === 0">
            <g v-for="([x, y], i) in DYNAMITE_SEEDS" :key="i">
              <ellipse :cx="x" :cy="y + 0.7" rx="2.2" ry="3" class="seed__pit" />
              <ellipse :cx="x" :cy="y" rx="1.3" ry="2.1" class="seed" />
            </g>
          </template>
          <template v-else-if="kind === 1">
            <circle v-for="([x, y], i) in DYNAMITE_PORES" :key="i" :cx="x" :cy="y" r="1.3" class="pore" />
          </template>
          <template v-else-if="kind === 2">
            <ellipse v-for="x in STICK_COLUMNS" :key="x" :cx="x" cy="94" rx="4" ry="3" class="lemon-tip" />
          </template>
          <template v-else-if="kind === 3">
            <g v-for="x in STICK_COLUMNS" :key="x">
              <path :d="`M${x} 30V96`" class="midrib midrib--thin" />
              <path :d="`M${x} 46l-7-7M${x} 46l7-7M${x} 84l-7-7M${x} 84l7-7`" class="vein" />
            </g>
          </template>
          <template v-else-if="kind === 4">
            <g v-for="([x, y], i) in DYNAMITE_FLOWERS" :key="i" :transform="`translate(${x} ${y})`">
              <ellipse
                v-for="a in PETALS"
                :key="a"
                cy="-4.5"
                rx="3"
                ry="4"
                :transform="`rotate(${a})`"
                class="mini-petal"
              />
              <circle r="2.6" class="mini-core" />
            </g>
          </template>
          <template v-else>
            <circle v-for="([x, y], i) in DYNAMITE_GRAPES" :key="i" :cx="x" :cy="y" r="7" class="body body--5 berry" />
          </template>
        </g>
        <template v-for="stick in DYNAMITE_STICKS" :key="stick.x">
          <rect
            :x="stick.x"
            :y="stick.y"
            width="22"
            :height="stick.h"
            rx="5"
            :class="`body body--${kind} dynamite__stick`"
          />
          <ellipse :cx="stick.x + 11" :cy="stick.y + 3.5" rx="8" ry="2.6" class="dynamite__end" />
          <path :d="`M${stick.x + 5} ${stick.y + 9}V${stick.y + stick.h - 6}`" class="dynamite__shine" />
        </template>
        <!-- Black tape around the bundle. -->
        <rect x="12" y="62" width="76" height="11" rx="2" class="dynamite__tape" />
        <path d="M12 65H88" class="dynamite__tape-shine" />
        <!-- Fuse and flame stay inside the cell (the board clips at its edge). -->
        <path d="M50 30Q49 17 58 13Q64 10 66 7" class="dynamite__fuse" />
        <g class="dynamite__flame">
          <path d="M66 -5Q75 3 70 10Q66 13 62 10Q57 3 66 -5Z" class="dynamite__flame-outer" />
          <path d="M66 2Q70 6 68 9Q66 11 64 9Q62 6 66 2Z" class="dynamite__flame-core" />
        </g>
      </g>
    </template>

    <template v-else>
      <ellipse cx="50" cy="94" rx="25" ry="4.5" class="ground" />
      <g class="fruit">
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

/* --- Rocket (fruit colour and texture from .body--k) ------------------------------- */

.berry {
  stroke-width: 2;
}

.rocket__fin {
  stroke: #232b40;
  stroke-width: 3;
}

.rocket__window {
  fill: #59c8ff;
  stroke: #232b40;
  stroke-width: 3;
}

.rocket__flame {
  fill: #ff7a00;
  transform-origin: 18px 50px;
  animation: flame 0.35s ease-in-out infinite alternate;
}

.rocket__flame-core {
  fill: #ffe14d;
  transform-origin: 18px 50px;
  animation: flame 0.25s ease-in-out infinite alternate-reverse;
}

/* --- Dynamite (fruit colour and texture from .body--k) ----------------------------- */

.dynamite__fill {
  stroke: none;
}

.dynamite__stick {
  fill: none;
  stroke-width: 2.8;
}

.dynamite__end {
  fill: rgb(255 255 255 / 45%);
}

.dynamite__shine {
  stroke: rgb(255 255 255 / 60%);
  stroke-width: 3;
  stroke-linecap: round;
}

.dynamite__tape {
  fill: #16181f;
  stroke: #000;
  stroke-width: 2.4;
}

.dynamite__tape-shine {
  stroke: rgb(255 255 255 / 30%);
  stroke-width: 2;
}

.dynamite__fuse {
  fill: none;
  stroke: #c9955c;
  stroke-width: 5;
  stroke-linecap: round;
}

.dynamite__flame {
  transform-origin: 66px 10px;
  animation: flicker 0.4s ease-in-out infinite alternate;
}

.dynamite__flame-outer {
  fill: #ff7a00;
  stroke: #d94a00;
  stroke-width: 1.5;
}

.dynamite__flame-core {
  fill: #ffe14d;
}

.midrib--thin {
  stroke-width: 2.6;
}

.lemon-tip {
  fill: rgb(160 110 0 / 35%);
}

.mini-petal {
  fill: #c4dcff;
  stroke: #0f378f;
  stroke-width: 1;
}

.mini-core {
  fill: #ffc21a;
  stroke: #b35f00;
  stroke-width: 1;
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

@keyframes flicker {
  from {
    transform: scale(0.85) rotate(-6deg);
  }
  to {
    transform: scale(1.15) rotate(6deg);
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
:root[data-still] .dynamite__flame,
:root[data-still] .prism__wheel {
  animation-play-state: paused;
}

:root[data-motion='reduced'] .item__arrow,
:root[data-motion='reduced'] .rocket__flame,
:root[data-motion='reduced'] .rocket__flame-core,
:root[data-motion='reduced'] .dynamite__flame,
:root[data-motion='reduced'] .prism__wheel {
  animation: none;
}
</style>
