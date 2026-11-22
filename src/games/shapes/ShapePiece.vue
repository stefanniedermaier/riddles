<script setup lang="ts">
import { ITEM_KIND, type Special } from './logic/types'

/**
 * One game piece as inline SVG (viewBox 0–100): fruit and garden motifs. Every kind has
 * its own colour *and* silhouette, so pieces can be told apart without colour vision:
 *
 * 0 strawberry · 1 orange · 2 lemon · 3 leaf · 4 flower · 5 grapes
 *
 * Specials are drawn on top of the piece: a rocket (clears a row or column), a bomb
 * (clears the area around it) and a rainbow ball (prism, clears one kind).
 */
defineProps<{ kind: number; special: Special }>()

/** Grapes: centres of the berries, back to front. */
const GRAPES: [number, number][] = [
  [32, 40],
  [52, 38],
  [71, 42],
  [42, 57],
  [62, 58],
  [52, 75],
]

/** Flower petals: five circles around the centre. */
const PETALS = Array.from({ length: 5 }, (_, i) => {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5
  return [50 + 23 * Math.cos(angle), 52 + 23 * Math.sin(angle)] as const
})

/** Strawberry seeds. */
const SEEDS: [number, number, number][] = [
  [34, 46, -20],
  [50, 44, 0],
  [66, 46, 20],
  [41, 59, -15],
  [59, 59, 15],
  [50, 72, 0],
  [30, 60, -30],
  [70, 60, 30],
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
      <path d="M26 46Q26 86 50 92Q74 86 74 46Z" class="item__nut" />
      <path d="M62 50Q66 76 52 88Q70 82 72 50Z" class="shade" />
      <path d="M20 46Q22 24 50 22Q78 24 80 46Q50 54 20 46Z" class="item__cap" />
      <path d="M30 36Q50 30 70 36M26 44Q50 38 74 44" class="item__cap-lines" />
      <path d="M50 22Q50 12 58 8" class="item__stem" />
      <path d="M50 58V76M42 69l8 8 8-8" class="item__arrow" />
    </template>

    <!-- Prism: a rainbow ball that clears every piece of one kind. -->
    <template v-else-if="special === 'prism'">
      <g class="prism">
        <circle cx="50" cy="50" r="44" class="prism__ring" />
        <g class="prism__wheel">
          <path v-for="(d, i) in WEDGES" :key="i" :d="d" :class="`fill-${i}`" />
        </g>
        <circle cx="50" cy="50" r="40" class="prism__gloss" />
        <path
          d="M50 30l5.5 12.5L68 44l-9.5 8.5L61 66l-11-6.5L39 66l2.5-13.5L32 44l12.5-1.5z"
          class="prism__star"
        />
        <ellipse cx="36" cy="28" rx="10" ry="6" transform="rotate(-30 36 28)" class="shine" />
      </g>
    </template>

    <template v-else>
      <ellipse cx="50" cy="93" rx="24" ry="4.5" class="ground" />
      <g class="fruit" :class="{ 'fruit--under': special !== 'none' }">
        <!-- 0 Strawberry -->
        <template v-if="kind === 0">
          <path d="M50 92C28 86 12 62 15 44C17 30 33 25 50 30C67 25 83 30 85 44C88 62 72 86 50 92Z" class="fill-0" />
          <path d="M50 92C70 86 86 62 85 44C80 62 68 80 50 92Z" class="shade" />
          <ellipse
            v-for="([x, y, r], i) in SEEDS"
            :key="i"
            :cx="x"
            :cy="y"
            rx="2.4"
            ry="3.6"
            :transform="`rotate(${r} ${x} ${y})`"
            class="seed"
          />
          <path d="M24 32Q34 20 44 28Q50 14 56 28Q66 20 76 32Q62 40 50 34Q38 40 24 32Z" class="leaf-green" />
          <path d="M50 28V12" class="stem" />
          <ellipse cx="31" cy="48" rx="6" ry="11" transform="rotate(-25 31 48)" class="shine" />
        </template>

        <!-- 1 Orange -->
        <template v-else-if="kind === 1">
          <circle cx="50" cy="56" r="36" class="fill-1 dark" />
          <circle cx="47" cy="53" r="32" class="fill-1" />
          <g class="pores">
            <circle cx="60" cy="66" r="1.6" />
            <circle cx="68" cy="56" r="1.6" />
            <circle cx="54" cy="76" r="1.6" />
            <circle cx="40" cy="70" r="1.6" />
            <circle cx="66" cy="72" r="1.6" />
          </g>
          <path d="M50 22V14" class="stem" />
          <path d="M52 20Q60 4 80 10Q72 26 52 20Z" class="leaf-green" />
          <path d="M55 19Q66 13 76 12" class="leaf-vein" />
          <ellipse cx="34" cy="42" rx="9" ry="6" transform="rotate(-35 34 42)" class="shine" />
        </template>

        <!-- 2 Lemon -->
        <template v-else-if="kind === 2">
          <g transform="rotate(-28 50 52)">
            <path d="M80 42Q96 50 80 62ZM20 42Q4 52 20 62Z" class="fill-2 dark" />
            <ellipse cx="50" cy="52" rx="36" ry="28" class="fill-2 dark" />
            <ellipse cx="48" cy="49" rx="32" ry="24" class="fill-2" />
            <ellipse cx="36" cy="40" rx="12" ry="5" class="shine" />
          </g>
          <path d="M70 20Q82 10 92 16Q84 28 70 20Z" class="leaf-green" />
        </template>

        <!-- 3 Leaf -->
        <template v-else-if="kind === 3">
          <g transform="rotate(32 50 50)">
            <path d="M50 6C80 24 84 62 50 90C16 62 20 24 50 6Z" class="fill-3" />
            <path d="M50 6C80 24 84 62 50 90Z" class="shade" />
            <path d="M50 14V96" class="vein" />
            <path d="M50 36L64 26M50 52L68 42M50 68L64 60M50 44L36 34M50 60L32 50M50 76L38 68" class="vein vein--thin" />
            <ellipse cx="36" cy="40" rx="5" ry="13" class="shine" />
          </g>
        </template>

        <!-- 4 Flower -->
        <template v-else-if="kind === 4">
          <circle v-for="([x, y], i) in PETALS" :key="`d${i}`" :cx="x" :cy="y" r="19" class="fill-4 dark" />
          <circle v-for="([x, y], i) in PETALS" :key="`p${i}`" :cx="x - 1.5" :cy="y - 1.5" r="16" class="fill-4" />
          <circle v-for="([x, y], i) in PETALS" :key="`s${i}`" :cx="x - 6" :cy="y - 6" r="4" class="shine" />
          <circle cx="50" cy="52" r="13" class="flower__ring" />
          <circle cx="49" cy="51" r="10" class="flower__core" />
          <circle cx="46" cy="48" r="3" class="shine" />
        </template>

        <!-- 5 Grapes -->
        <template v-else>
          <path d="M52 30V14" class="stem" />
          <path d="M54 20Q66 4 86 12Q76 28 54 20Z" class="leaf-green" />
          <template v-for="([x, y], i) in GRAPES" :key="i">
            <circle :cx="x" :cy="y" r="13" class="fill-5 dark" />
            <circle :cx="x - 1.5" :cy="y - 1.5" r="10.5" class="fill-5" />
            <circle :cx="x - 5" :cy="y - 5" r="3" class="shine" />
          </template>
        </template>
      </g>

      <!-- Rocket: clears a row (line-h) or a column (line-v). -->
      <g
        v-if="special === 'line-h' || special === 'line-v'"
        class="rocket"
        :transform="special === 'line-v' ? 'rotate(-90 50 50)' : undefined"
      >
        <path d="M24 50Q10 42 4 50Q10 58 24 50Z" class="rocket__flame" />
        <path d="M24 50Q15 46 11 50Q15 54 24 50Z" class="rocket__flame-core" />
        <path d="M34 38L24 24H38L46 38ZM34 62L24 76H38L46 62Z" class="rocket__fin" />
        <path d="M24 38H66Q84 38 94 50Q84 62 66 62H24Z" class="rocket__body" />
        <path d="M78 41Q88 44 94 50Q88 56 78 59Z" class="rocket__nose" />
        <circle cx="60" cy="50" r="7" class="rocket__window" />
        <path d="M30 42H62" class="rocket__shine" />
      </g>

      <!-- Bomb: clears the area around it. -->
      <g v-else-if="special === 'burst'" class="bomb">
        <circle cx="56" cy="60" r="26" class="bomb__body" />
        <rect x="62" y="28" width="14" height="10" rx="2" transform="rotate(35 69 33)" class="bomb__cap" />
        <path d="M73 30Q78 18 88 16" class="bomb__fuse" />
        <path
          d="M89 7l2.4 6.2 6.6.4-5.1 4.2 1.7 6.4L89 20.6l-5.6 3.6 1.7-6.4L80 13.6l6.6-.4z"
          class="bomb__spark"
        />
        <ellipse cx="45" cy="50" rx="7" ry="10" transform="rotate(35 45 50)" class="shine" />
      </g>
    </template>
  </svg>
</template>

<style scoped>
.shape-piece {
  /* Saturated fruit colours (main / darker rim). */
  --fruit-0: #f0213f;
  --fruit-0-dark: #b5102a;
  --fruit-1: #ff8a00;
  --fruit-1-dark: #d96400;
  --fruit-2: #ffd21a;
  --fruit-2-dark: #e0a800;
  --fruit-3: #22b34c;
  --fruit-3-dark: #157a32;
  --fruit-4: #2f7dff;
  --fruit-4-dark: #1a55c9;
  --fruit-5: #9b40f2;
  --fruit-5-dark: #6c1fc0;
  --leaf: #2fa84f;
  --stem: #7a4a1f;
  --outline: rgb(40 20 10 / 35%);

  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

:root[data-theme='dark'] .shape-piece {
  --fruit-0: #ff4560;
  --fruit-0-dark: #d01c38;
  --fruit-1: #ff9a1f;
  --fruit-1-dark: #e07000;
  --fruit-2: #ffdc3d;
  --fruit-2-dark: #e8b400;
  --fruit-3: #34c95e;
  --fruit-3-dark: #1c9140;
  --fruit-4: #4b90ff;
  --fruit-4-dark: #2a66e0;
  --fruit-5: #ad5cff;
  --fruit-5-dark: #8030d6;
  --leaf: #3cc463;
  --stem: #b07a45;
  --outline: rgb(0 0 0 / 50%);
}

.fill-0 { fill: var(--fruit-0); }
.fill-1 { fill: var(--fruit-1); }
.fill-2 { fill: var(--fruit-2); }
.fill-3 { fill: var(--fruit-3); }
.fill-4 { fill: var(--fruit-4); }
.fill-5 { fill: var(--fruit-5); }
.fill-0.dark { fill: var(--fruit-0-dark); }
.fill-1.dark { fill: var(--fruit-1-dark); }
.fill-2.dark { fill: var(--fruit-2-dark); }
.fill-3.dark { fill: var(--fruit-3-dark); }
.fill-4.dark { fill: var(--fruit-4-dark); }
.fill-5.dark { fill: var(--fruit-5-dark); }

.fruit {
  transform-origin: 50% 50%;
}

/* A soft contact shadow under every piece (cheaper than a filter on 64 pieces). */
.ground {
  fill: var(--outline);
}

/* Under a rocket or bomb the fruit stays recognisable but steps back a little. */
.fruit--under {
  transform: scale(0.9);
}

.shade {
  fill: rgb(0 0 0 / 16%);
}

.shine {
  fill: #fff;
  opacity: 0.55;
}

.seed {
  fill: #ffe7a1;
}

.stem {
  fill: none;
  stroke: var(--stem);
  stroke-width: 5;
  stroke-linecap: round;
}

.leaf-green {
  fill: var(--leaf);
}

.leaf-vein {
  fill: none;
  stroke: rgb(0 0 0 / 22%);
  stroke-width: 2;
  stroke-linecap: round;
}

.pores circle {
  fill: rgb(0 0 0 / 14%);
}

.vein {
  fill: none;
  stroke: var(--fruit-3-dark);
  stroke-width: 3.5;
  stroke-linecap: round;
}

.vein--thin {
  stroke-width: 2.2;
}

.flower__ring {
  fill: #f08a00;
}

.flower__core {
  fill: #ffd23f;
}

/* --- Drop item (acorn) ----------------------------------------------------------- */

.item__nut {
  fill: #c9853d;
}

.item__cap {
  fill: #6e4320;
}

.item__cap-lines {
  fill: none;
  stroke: #4a2a10;
  stroke-width: 2.5;
  stroke-linecap: round;
}

.item__stem {
  fill: none;
  stroke: #4a2a10;
  stroke-width: 5;
  stroke-linecap: round;
}

.item__arrow {
  fill: none;
  stroke: #fff;
  stroke-width: 7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* --- Rocket -------------------------------------------------------------------- */

.rocket {
  filter: drop-shadow(0 2px 2px rgb(0 0 0 / 40%));
}

.rocket__body {
  fill: #f4f6fb;
  stroke: #273046;
  stroke-width: 3.5;
  stroke-linejoin: round;
}

.rocket__nose,
.rocket__fin {
  fill: #ff3b4e;
  stroke: #273046;
  stroke-width: 3;
  stroke-linejoin: round;
}

.rocket__window {
  fill: #59c8ff;
  stroke: #273046;
  stroke-width: 3.5;
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

.bomb {
  filter: drop-shadow(0 2px 2px rgb(0 0 0 / 40%));
}

.bomb__body {
  fill: #262a36;
  stroke: #10131b;
  stroke-width: 3;
}

.bomb__cap {
  fill: #5b6170;
  stroke: #10131b;
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
  transform-origin: 89px 16px;
  animation: spark 0.45s ease-in-out infinite alternate;
}

/* --- Prism (rainbow ball) ------------------------------------------------------- */

.prism__ring {
  fill: #fff;
  stroke: rgb(0 0 0 / 25%);
  stroke-width: 3;
}

.prism__wheel {
  transform-origin: 50px 50px;
  animation: spin 4s linear infinite;
}

.prism__gloss {
  fill: none;
  stroke: rgb(255 255 255 / 60%);
  stroke-width: 2;
}

.prism__star {
  fill: #fff;
  stroke: rgb(0 0 0 / 25%);
  stroke-width: 2;
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

:root[data-motion='reduced'] .rocket__flame,
:root[data-motion='reduced'] .rocket__flame-core,
:root[data-motion='reduced'] .bomb__spark,
:root[data-motion='reduced'] .prism__wheel {
  animation: none;
}
</style>
