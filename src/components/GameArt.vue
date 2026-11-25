<script setup lang="ts">
import { useId } from 'vue'

import type { GameId } from '@/games/types'

/** Small original illustrations for the home screen cards. */
defineProps<{ game: GameId }>()

/** Ids of the shared gradients (unique per logo on the page). */
const uid = useId()
const ids = Object.fromEntries(
  ['glaze', 'gold', 'meadow', 'bomb', 'liquid', 'peg', 'tube1', 'tube2', 'tube3', 'bevel', 'red', 'orange', 'green', 'purple', 'leaf'].map((name) => [name, `art-${name}-${uid}`]),
) as Record<string, string>
</script>

<template>
  <svg class="game-art" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient :id="ids.glaze" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".45" />
        <stop offset="1" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
      <radialGradient :id="ids.gold" cx=".4" cy=".3" r=".8">
        <stop offset="0" stop-color="#fff6b0" /><stop offset=".5" stop-color="#ffc21a" /><stop offset="1" stop-color="#d97a00" />
      </radialGradient>
      <linearGradient :id="ids.meadow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#74c95f" /><stop offset=".55" stop-color="#3f8f33" /><stop offset="1" stop-color="#2f7428" />
      </linearGradient>
      <radialGradient :id="ids.bomb" cx=".36" cy=".3" r=".78">
        <stop offset="0" stop-color="#8d96ab" /><stop offset=".5" stop-color="#2d3242" /><stop offset="1" stop-color="#0b0d14" />
      </radialGradient>
      <linearGradient :id="ids.liquid" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
        <stop offset="0" stop-color="#000" stop-opacity=".2" /><stop offset=".4" stop-color="#fff" stop-opacity=".25" /><stop offset="1" stop-color="#000" stop-opacity=".2" />
      </linearGradient>
      <linearGradient :id="ids.bevel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".45" /><stop offset=".45" stop-color="#fff" stop-opacity="0" />
        <stop offset=".7" stop-color="#000" stop-opacity="0" /><stop offset="1" stop-color="#000" stop-opacity=".28" />
      </linearGradient>
      <radialGradient :id="ids.red" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#ff9aa6" /><stop offset=".5" stop-color="#f2263f" /><stop offset="1" stop-color="#a30c22" /></radialGradient>
      <radialGradient :id="ids.orange" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#ffe0a0" /><stop offset=".5" stop-color="#ff9412" /><stop offset="1" stop-color="#c75600" /></radialGradient>
      <radialGradient :id="ids.green" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#b8f58a" /><stop offset=".5" stop-color="#2fbd4f" /><stop offset="1" stop-color="#0f7a2c" /></radialGradient>
      <radialGradient :id="ids.purple" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#e7c4ff" /><stop offset=".5" stop-color="#a24bf5" /><stop offset="1" stop-color="#5a12a8" /></radialGradient>
      <radialGradient :id="ids.leaf" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#a6ef7c" /><stop offset=".5" stop-color="#3cb850" /><stop offset="1" stop-color="#167a30" /></radialGradient>
      <radialGradient :id="ids.peg" cx=".35" cy=".3" r=".75">
        <stop offset="0" stop-color="#fff" stop-opacity=".75" /><stop offset=".45" stop-color="#fff" stop-opacity="0" /><stop offset="1" stop-color="#000" stop-opacity=".25" />
      </radialGradient>
    </defs>
    <template v-if="game === 'sudoku'">
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <g stroke="var(--game-sudoku)" stroke-width="1.5" opacity=".35">
        <path d="M22.7 8v48M41.3 8v48M8 22.7h48M8 41.3h48" />
      </g>
      <g fill="var(--game-sudoku)" font-family="var(--font-sans)" font-weight="700" font-size="13" text-anchor="middle">
        <text x="15.3" y="20">5</text>
        <text x="32" y="38.5">3</text>
        <text x="48.7" y="57" opacity=".55">9</text>
        <text x="48.7" y="20" opacity=".55">1</text>
        <text x="15.3" y="57">7</text>
      </g>
    </template>
    <template v-else-if="game === 'crowns'">
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <!-- Four glossy regions, two golden stars (as on the board). -->
      <rect x="8" y="8" width="24" height="24" rx="4" fill="#eb4773" />
      <rect x="32" y="8" width="24" height="24" rx="4" fill="#47c2eb" />
      <rect x="8" y="32" width="24" height="24" rx="4" fill="#47eb5d" />
      <rect x="32" y="32" width="24" height="24" rx="4" fill="#f0b642" />
      <path d="M8 32h48M32 8v48" stroke="#1d1b26" stroke-width="2" opacity=".55" />
      <g :fill="`url(#${ids.gold})`" stroke="#5a3000" stroke-width="1.2" stroke-linejoin="round">
        <path d="M44 11.5l2.5 6.8 7.2.3-5.7 4.5 2 7-6-4-6 4 2-7-5.7-4.5 7.2-.3z" />
        <path d="M20 35.5l2.5 6.8 7.2.3-5.7 4.5 2 7-6-4-6 4 2-7-5.7-4.5 7.2-.3z" />
      </g>
      <g fill="#fff" opacity=".85"><path d="M41.6 18.4l2-5 .9 3z" /><path d="M17.6 42.4l2-5 .9 3z" /></g>
    </template>
    <template v-else-if="game === 'links'">
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <g fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 15h34v12" stroke="#e2445c" />
        <path d="M15 27v22h20" stroke="#3a72d6" />
        <path d="M27 39h22" stroke="#2f9e6e" opacity=".9" />
      </g>
      <g>
        <circle cx="15" cy="15" r="5.5" fill="#e2445c" />
        <circle cx="49" cy="27" r="5.5" fill="#e2445c" />
        <circle cx="15" cy="27" r="5.5" fill="#3a72d6" />
        <circle cx="35" cy="49" r="5.5" fill="#3a72d6" />
        <circle cx="27" cy="39" r="5.5" fill="#2f9e6e" />
        <circle cx="49" cy="39" r="5.5" fill="#2f9e6e" />
      </g>
    </template>
    <template v-else-if="game === 'nonogram'">
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <g fill="var(--game-nonogram)" font-family="var(--font-sans)" font-weight="700" font-size="7" text-anchor="middle" opacity=".75">
        <text x="12" y="31">2</text>
        <text x="12" y="41">4</text>
        <text x="12" y="51">1 1</text>
        <text x="27" y="17">3</text>
        <text x="37" y="17">2</text>
        <text x="47" y="17">2</text>
      </g>
      <g fill="var(--game-nonogram)">
        <rect x="23" y="24" width="9" height="9" rx="1.5" />
        <rect x="33" y="24" width="9" height="9" rx="1.5" />
        <rect x="23" y="34" width="9" height="9" rx="1.5" />
        <rect x="33" y="34" width="9" height="9" rx="1.5" />
        <rect x="43" y="34" width="9" height="9" rx="1.5" />
        <rect x="23" y="44" width="9" height="9" rx="1.5" />
        <rect x="43" y="44" width="9" height="9" rx="1.5" />
      </g>
      <rect x="43" y="24" width="9" height="9" rx="1.5" fill="none" stroke="var(--game-nonogram)" stroke-opacity=".35" />
      <rect x="33" y="44" width="9" height="9" rx="1.5" fill="none" stroke="var(--game-nonogram)" stroke-opacity=".35" />
    </template>
    <template v-else-if="game === 'merge'">
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <g font-family="var(--font-sans)" font-weight="800" text-anchor="middle">
        <rect x="9" y="9" width="21" height="21" rx="5" fill="var(--game-merge)" opacity=".25" />
        <text x="19.5" y="24" font-size="11" fill="var(--game-merge)">2</text>
        <rect x="34" y="9" width="21" height="21" rx="5" fill="var(--game-merge)" opacity=".45" />
        <text x="44.5" y="24" font-size="11" fill="var(--color-surface)">4</text>
        <rect x="9" y="34" width="21" height="21" rx="5" fill="var(--game-merge)" opacity=".7" />
        <text x="19.5" y="49" font-size="10" fill="var(--color-surface)">16</text>
        <rect x="34" y="34" width="21" height="21" rx="5" fill="var(--game-merge)" />
        <text x="44.5" y="48.5" font-size="8" fill="var(--color-surface)">128</text>
      </g>
    </template>
    <template v-else-if="game === 'arrows'">
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <!-- Four arrows on a grid that never cross: one colour, like on the board. -->
      <g fill="none" stroke="var(--game-arrows)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 14h22" />
        <path d="M50 48V20" />
        <path d="M14 26v24h16" />
        <path d="M40 34H28" />
      </g>
      <g fill="var(--game-arrows)" stroke="var(--game-arrows)" stroke-width="1.5" stroke-linejoin="round">
        <path d="M33 8.5l7.5 5.5-7.5 5.5z" />
        <path d="M44.5 21l5.5-7.5 5.5 7.5z" />
        <path d="M29 44.5l7.5 5.5-7.5 5.5z" />
        <path d="M29 28.5l-7.5 5.5 7.5 5.5z" />
      </g>
    </template>
    <template v-else-if="game === 'blocks'">
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <!-- A 4×4 board: a full row about to clear and an L piece – blocks with the game's bevel. -->
      <rect x="7" y="7" width="50" height="50" fill="color-mix(in srgb, var(--game-blocks) 12%, var(--color-surface))" />
      <g fill="color-mix(in srgb, var(--game-blocks) 18%, var(--color-surface))">
        <rect v-for="i in 16" :key="i" :x="8.5 + ((i - 1) % 4) * 12" :y="8.5 + Math.floor((i - 1) / 4) * 12" width="11" height="11" rx="2" />
      </g>
      <g>
        <rect x="8.5" y="32.5" width="11" height="11" rx="2" fill="#3b82f6" />
        <rect x="20.5" y="32.5" width="11" height="11" rx="2" fill="#3b82f6" />
        <rect x="32.5" y="32.5" width="11" height="11" rx="2" fill="#22c55e" />
        <rect x="44.5" y="32.5" width="11" height="11" rx="2" fill="#22c55e" />
        <rect x="8.5" y="44.5" width="11" height="11" rx="2" fill="#ef4444" />
        <rect x="32.5" y="44.5" width="11" height="11" rx="2" fill="#a855f7" />
        <rect x="44.5" y="44.5" width="11" height="11" rx="2" fill="#a855f7" />
        <rect x="20.5" y="8.5" width="11" height="11" rx="2" fill="#f97316" />
        <rect x="32.5" y="8.5" width="11" height="11" rx="2" fill="#f97316" />
        <rect x="32.5" y="20.5" width="11" height="11" rx="2" fill="#f97316" />
      </g>
      <!-- Bevel: light top edge, dark bottom edge, a gloss on every block. -->
      <g :fill="`url(#${ids.bevel})`">
        <rect x="8.5" y="32.5" width="11" height="11" rx="2" />
        <rect x="20.5" y="32.5" width="11" height="11" rx="2" />
        <rect x="32.5" y="32.5" width="11" height="11" rx="2" />
        <rect x="44.5" y="32.5" width="11" height="11" rx="2" />
        <rect x="8.5" y="44.5" width="11" height="11" rx="2" />
        <rect x="32.5" y="44.5" width="11" height="11" rx="2" />
        <rect x="44.5" y="44.5" width="11" height="11" rx="2" />
        <rect x="20.5" y="8.5" width="11" height="11" rx="2" />
        <rect x="32.5" y="8.5" width="11" height="11" rx="2" />
        <rect x="32.5" y="20.5" width="11" height="11" rx="2" />
      </g>
      <path d="M8 38.5h48" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85" />
    </template>
    <template v-else-if="game === 'mines'">
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <!-- A corner of the board: glossy meadow tiles, sand with numbers, a flag and a mine. -->
      <rect x="8" y="8" width="48" height="48" rx="5" fill="#f6efdc" />
      <g :fill="`url(#${ids.meadow})`" stroke="#2f6b2a" stroke-width="1">
        <rect x="9" y="9" width="14.5" height="14.5" rx="3" />
        <rect x="24.8" y="9" width="14.5" height="14.5" rx="3" />
        <rect x="9" y="24.8" width="14.5" height="14.5" rx="3" />
        <rect x="40.5" y="40.5" width="14.5" height="14.5" rx="3" />
      </g>
      <g font-family="var(--font-sans)" font-weight="800" font-size="11" text-anchor="middle">
        <text x="48" y="20" fill="#1d5fc9">1</text>
        <text x="32" y="36" fill="#17773a">2</text>
        <text x="16" y="52" fill="#1d5fc9">1</text>
      </g>
      <rect x="43.6" y="26" width="1.6" height="12" rx=".8" fill="#7a4a1f" />
      <path d="M45.2 26.3q3.4-1 6.8 1.6-3 1.4 0 3.8-3.4-1.2-6.8 0z" fill="#f2263f" stroke="#6e0614" stroke-width=".7" stroke-linejoin="round" />
      <ellipse cx="44.4" cy="38.2" rx="4" ry="1.3" fill="#6b4a2a" />
      <g stroke="#23262f" stroke-width="1.8" stroke-linecap="round">
        <path d="M32 41v14M25 48h14M27 43l10 10M37 43l-10 10" />
      </g>
      <circle cx="32" cy="48" r="4.6" :fill="`url(#${ids.bomb})`" stroke="#05060a" stroke-width=".6" />
      <ellipse cx="30.4" cy="46.4" rx="1.4" ry=".9" fill="#fff" opacity=".8" />
    </template>
    <template v-else-if="game === 'pipes'">
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <!-- A small pipe network: water from the tank fills the connected pipes. -->
      <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="6">
        <path d="M32 32H48V14M32 32V50H16" stroke="var(--game-pipes)" />
        <path d="M16 50V36M48 14H16V24" stroke="var(--game-pipes)" opacity=".3" />
      </g>
      <circle cx="32" cy="32" r="7" fill="var(--game-pipes)" stroke="var(--color-surface)" stroke-width="2" />
      <circle cx="16" cy="36" r="4" fill="var(--color-surface)" stroke="var(--game-pipes)" stroke-width="2" opacity=".5" />
    </template>
    <template v-else-if="game === 'watersort'">
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <!-- Three test tubes with a lip and shaded water, one almost sorted. -->
      <defs>
        <clipPath :id="ids.tube1"><path d="M10 12v41a6 6 0 0 0 12 0V12z" /></clipPath>
        <clipPath :id="ids.tube2"><path d="M26 12v41a6 6 0 0 0 12 0V12z" /></clipPath>
        <clipPath :id="ids.tube3"><path d="M42 12v41a6 6 0 0 0 12 0V12z" /></clipPath>
      </defs>
      <g :clip-path="`url(#${ids.tube1})`">
        <rect x="10" y="36" width="12" height="7" fill="#1565d8" />
        <rect x="10" y="43" width="12" height="7" fill="#d81b2c" />
        <rect x="10" y="50" width="12" height="10" fill="#f2c200" />
      </g>
      <g :clip-path="`url(#${ids.tube2})`">
        <rect x="26" y="22" width="12" height="21" fill="#d81b2c" />
        <rect x="26" y="43" width="12" height="17" fill="#1565d8" />
      </g>
      <g :clip-path="`url(#${ids.tube3})`">
        <rect x="42" y="43" width="12" height="17" fill="#f2c200" />
      </g>
      <g :fill="`url(#${ids.liquid})`">
        <path d="M10 36h12v24H10zM26 22h12v38H26zM42 43h12v17H42z" />
      </g>
      <g fill="none" stroke="#6b5a8a" stroke-width="1.8" stroke-linejoin="round">
        <path d="M10 12v41a6 6 0 0 0 12 0V12" />
        <path d="M26 12v41a6 6 0 0 0 12 0V12" />
        <path d="M42 12v41a6 6 0 0 0 12 0V12" />
      </g>
      <g fill="#fff" stroke="#6b5a8a" stroke-width="1.4">
        <rect x="8" y="9" width="16" height="4" rx="2" />
        <rect x="24" y="9" width="16" height="4" rx="2" />
        <rect x="40" y="9" width="16" height="4" rx="2" />
      </g>
      <g fill="#fff" opacity=".6"><rect x="12.5" y="15" width="2" height="36" rx="1" /><rect x="28.5" y="15" width="2" height="36" rx="1" /><rect x="44.5" y="15" width="2" height="36" rx="1" /></g>
    </template>
    <template v-else-if="game === 'codebreaker'">
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <!-- Two guesses with feedback dots and the hidden code on top – glossy pegs. -->
      <g fill="var(--color-surface-3)" stroke="#8a8798" stroke-width=".8">
        <circle cx="13" cy="14" r="5" /><circle cx="25" cy="14" r="5" /><circle cx="37" cy="14" r="5" />
      </g>
      <g stroke="#1d1b26" stroke-width=".9" stroke-opacity=".55">
        <circle cx="13" cy="31" r="5" fill="#d81b2c" /><circle cx="25" cy="31" r="5" fill="#1565d8" />
        <circle cx="37" cy="31" r="5" fill="#f2c200" />
        <circle cx="13" cy="47" r="5" fill="#1565d8" /><circle cx="25" cy="47" r="5" fill="#d81b2c" />
        <circle cx="37" cy="47" r="5" fill="#0f9438" />
      </g>
      <g :fill="`url(#${ids.peg})`">
        <circle cx="13" cy="31" r="5" /><circle cx="25" cy="31" r="5" /><circle cx="37" cy="31" r="5" />
        <circle cx="13" cy="47" r="5" /><circle cx="25" cy="47" r="5" /><circle cx="37" cy="47" r="5" />
      </g>
      <g fill="var(--game-codebreaker)">
        <circle cx="49" cy="28" r="2.4" /><circle cx="55" cy="28" r="2.4" fill="none" stroke="var(--game-codebreaker)" stroke-width="1.4" />
        <circle cx="49" cy="44" r="2.4" /><circle cx="55" cy="44" r="2.4" /><circle cx="49" cy="50" r="2.4" />
      </g>
      <path d="M8 22h40" stroke="var(--game-codebreaker)" stroke-width="1.5" opacity=".4" />
    </template>
    <template v-else-if="game === 'solitaire' || game === 'spider' || game === 'freecell' || game === 'tripeaks'">
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <!-- Original card motifs, one per game. -->
      <!-- Solitaire: a tableau column – face-down cards in a staircase, the ace of hearts on top. -->
      <g v-if="game === 'solitaire'">
        <rect x="16" y="7" width="26" height="30" rx="2.5" :fill="`var(--game-${game})`" stroke="#fff" stroke-width="1.6" />
        <rect x="16" y="13" width="26" height="30" rx="2.5" :fill="`var(--game-${game})`" stroke="#fff" stroke-width="1.6" />
        <rect x="16" y="19" width="26" height="30" rx="2.5" :fill="`var(--game-${game})`" stroke="#fff" stroke-width="1.6" />
        <rect x="16" y="25" width="26" height="32" rx="2.5" fill="#fff" stroke="#6f6b80" stroke-width="1.1" />
        <text x="19.5" y="34" font-family="var(--font-sans)" font-weight="800" font-size="8" fill="#c0262f">A</text>
        <path d="M5 9.6C3 7.8 0 5.6 0 3.2 0 1.4 1.3 0 3 0c.9 0 1.6.5 2 1.2C5.4.5 6.1 0 7 0c1.7 0 3 1.4 3 3.2 0 2.4-3 4.6-5 6.4z" fill="#c0262f" transform="translate(23 39) scale(1.2)" />
      </g>
      <!-- Spider: a spider on its thread above a king of spades, a web in the corner. -->
      <g v-else-if="game === 'spider'">
        <g fill="none" stroke="#8a8699" stroke-width=".8" opacity=".8">
          <path d="M60 4L42 4M60 4L60 22M60 4L47 17" />
          <path d="M55 4Q55 9 60 9M50 4Q50 14 60 14M45 4Q46 19 60 19" />
        </g>
        <rect x="9" y="24" width="24" height="32" rx="2.5" fill="#4338ca" stroke="#fff" stroke-width="1.6" transform="rotate(-10 21 40)" />
        <rect x="22" y="22" width="25" height="34" rx="2.5" fill="#fff" stroke="#6f6b80" stroke-width="1.1" transform="rotate(6 34 39)" />
        <text x="26" y="32" font-family="var(--font-sans)" font-weight="800" font-size="8" fill="#1d1b26" transform="rotate(6 34 39)">K</text>
        <path d="M5 0C3.4 2.4 0 4.3 0 6.6c0 1.9 1.9 3 3.6 2.2.4-.2.7-.5.9-.8L4 10h2l-.5-2c.2.3.5.6.9.8C8.1 9.6 10 8.5 10 6.6 10 4.3 6.6 2.4 5 0z" fill="#1d1b26" transform="rotate(6 34 39) translate(29 38) scale(1.25)" />
        <!-- The spider in the text colour: near black in light mode, near white in dark mode. -->
        <path d="M22 4v11" stroke="var(--color-text)" stroke-width=".9" />
        <g stroke="var(--color-text)" stroke-width="1.3" stroke-linecap="round" fill="none">
          <path d="M19 17l-4-3M19 19l-5 0M19 21l-4 3M19 23l-3 4M25 17l4-3M25 19l5 0M25 21l4 3M25 23l3 4" />
        </g>
        <ellipse cx="22" cy="17" rx="2.6" ry="2.2" fill="var(--color-text)" />
        <ellipse cx="22" cy="22" rx="3.6" ry="4" fill="var(--color-text)" />
        <ellipse cx="21" cy="20.6" rx="1.1" ry=".8" fill="#fff" opacity=".6" />
      </g>
      <!-- FreeCell: four free cells on top, one holding a card, an open column below. -->
      <g v-else-if="game === 'freecell'">
        <g fill="none" stroke="color-mix(in srgb, var(--game-freecell) 70%, #000)" stroke-width="1.2" stroke-dasharray="2.5 2">
          <rect x="7.5" y="8" width="11" height="15" rx="2" />
          <rect x="20.5" y="8" width="11" height="15" rx="2" />
          <rect x="46.5" y="8" width="11" height="15" rx="2" />
        </g>
        <rect x="33.5" y="8" width="11" height="15" rx="2" fill="#fff" stroke="#6f6b80" stroke-width="1.1" />
        <path d="M5 0l4 5-4 5-4-5z" fill="#c0262f" transform="translate(35.5 11) scale(.7)" />
        <rect x="14" y="28" width="22" height="28" rx="2.5" fill="#fff" stroke="#6f6b80" stroke-width="1.1" />
        <rect x="28" y="32" width="22" height="24" rx="2.5" fill="#fff" stroke="#6f6b80" stroke-width="1.1" />
        <text x="31" y="41" font-family="var(--font-sans)" font-weight="800" font-size="8" fill="#1d1b26">Q</text>
        <path d="M5 0C3.4 2.4 0 4.3 0 6.6c0 1.9 1.9 3 3.6 2.2.4-.2.7-.5.9-.8L4 10h2l-.5-2c.2.3.5.6.9.8C8.1 9.6 10 8.5 10 6.6 10 4.3 6.6 2.4 5 0z" fill="#1d1b26" transform="translate(37 44) scale(.9)" />
        <text x="17" y="37" font-family="var(--font-sans)" font-weight="800" font-size="8" fill="#c0262f">J</text>
      </g>
      <!-- TriPeaks: a peak of cards. -->
      <g v-else>
        <rect x="23" y="9" width="18" height="25" rx="2.5" :fill="`var(--game-${game})`" stroke="#fff" stroke-width="1.6" />
        <rect x="11" y="22" width="18" height="25" rx="3" fill="#fff" stroke="#8a8699" stroke-width="1.2" />
        <rect x="35" y="22" width="18" height="25" rx="3" fill="#fff" stroke="#8a8699" stroke-width="1.2" />
        <text x="15" y="33" font-family="var(--font-sans)" font-weight="800" font-size="9" fill="#c0262f">7</text>
        <text x="39" y="33" font-family="var(--font-sans)" font-weight="800" font-size="9" fill="#1d1b26">8</text>
        <rect x="23" y="42" width="18" height="16" rx="3" fill="#fff" stroke="#8a8699" stroke-width="1.2" />
        <text x="27" y="53" font-family="var(--font-sans)" font-weight="800" font-size="9" fill="#c0262f">9</text>
      </g>
    </template>
    <template v-else>
      <rect x="4" y="4" width="56" height="56" fill="var(--color-surface)" />
      <!-- Strawberry, orange, leaf and grapes – glossy, outlined, as on the Shapes board. -->
      <path d="M20 31C13 29 8 22 9 16c1-4 6-5 11-4 5-1 10 0 11 4 1 6-4 13-11 15z" :fill="`url(#${ids.red})`" stroke="#7d0718" stroke-width="1" />
      <g fill="#fff1b0"><circle cx="15.5" cy="18" r=".9" /><circle cx="22.5" cy="18" r=".9" /><circle cx="19" cy="23.5" r=".9" /><circle cx="14" cy="22" r=".8" /><circle cx="24" cy="22" r=".8" /></g>
      <path d="M12.5 12.5q3.5-4.5 7.5-1.5 3.5-3 7.5 1.5-3.5 2.5-7.5 1.5-4 1-7.5-1.5z" :fill="`url(#${ids.leaf})`" stroke="#145f24" stroke-width=".8" />
      <ellipse cx="13.6" cy="18" rx="1.8" ry="3.4" transform="rotate(-24 13.6 18)" fill="#fff" opacity=".7" />
      <circle cx="44" cy="22" r="10.5" :fill="`url(#${ids.orange})`" stroke="#9c4100" stroke-width="1" />
      <path d="M45 11.5q3-6 10-4-3 6-10 4z" :fill="`url(#${ids.leaf})`" stroke="#145f24" stroke-width=".8" />
      <ellipse cx="39.5" cy="17.5" rx="3.2" ry="2" transform="rotate(-38 39.5 17.5)" fill="#fff" opacity=".75" />
      <g transform="rotate(32 20 44)">
        <path d="M20 32c9 5 10 17 0 24-10-7-9-19 0-24z" :fill="`url(#${ids.green})`" stroke="#0b5a20" stroke-width="1" />
        <path d="M20 34v21" stroke="#d4ff9e" stroke-width="1.4" stroke-linecap="round" opacity=".85" />
        <ellipse cx="16.5" cy="40" rx="1.3" ry="3.6" fill="#fff" opacity=".6" />
      </g>
      <path d="M43 37v-4" stroke="#6b3d14" stroke-width="2" stroke-linecap="round" />
      <g :fill="`url(#${ids.purple})`" stroke="#430a80" stroke-width=".9">
        <circle cx="38" cy="42" r="4.8" /><circle cx="48" cy="42" r="4.8" /><circle cx="43" cy="50" r="4.8" />
      </g>
      <g fill="#fff" opacity=".7"><ellipse cx="36.4" cy="40.4" rx="1.4" ry=".9" /><ellipse cx="46.4" cy="40.4" rx="1.4" ry=".9" /><ellipse cx="41.4" cy="48.4" rx="1.4" ry=".9" /></g>
    </template>
    <!-- A soft glaze on the top half of every logo (one look for all games). -->
    <path d="M4 4h56v18Q32 30 4 22z" :fill="`url(#${ids.glaze})`" class="game-art__glaze" />
  </svg>
</template>

<style scoped>
:root[data-theme='dark'] .game-art__glaze {
  opacity: 0.35;
}

/* Inside a forced light theme (shared result image) the glaze stays at full strength. */
:root[data-theme] .theme-light .game-art__glaze {
  opacity: 1;
}

.game-art {
  display: block;
  width: 72px;
  height: 72px;
  flex: none;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 12%));
}
</style>
