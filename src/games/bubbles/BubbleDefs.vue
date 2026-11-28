<script setup lang="ts">
import { ORB_COLORS } from './colors'

/**
 * Shared gradients of the energy orbs, put once into every SVG that draws bubbles. All ids
 * start with `ids` (unique per SVG): `<ids>-orb-<n>` (body), `<ids>-halo-<n>` (glow),
 * `<ids>-spec` (highlight), `<ids>-rock`, `<ids>-mine`, `<ids>-core`.
 */
defineProps<{ ids: string }>()
</script>

<template>
  <defs>
    <template v-for="(c, n) in ORB_COLORS" :key="n">
      <radialGradient :id="`${ids}-orb-${n}`" cx="0.4" cy="0.36" r="0.68">
        <stop offset="0" :stop-color="c.light" />
        <stop offset="0.38" :stop-color="c.main" />
        <stop offset="0.86" :stop-color="c.deep" />
        <stop offset="1" :stop-color="c.main" />
      </radialGradient>
      <radialGradient :id="`${ids}-halo-${n}`" r="0.5">
        <stop offset="0.62" :stop-color="c.main" stop-opacity="0.5" />
        <stop offset="1" :stop-color="c.main" stop-opacity="0" />
      </radialGradient>
    </template>
    <radialGradient :id="`${ids}-spec`" cx="0.34" cy="0.28" r="0.42">
      <stop offset="0" stop-color="#fff" stop-opacity="0.95" />
      <stop offset="0.45" stop-color="#fff" stop-opacity="0.28" />
      <stop offset="1" stop-color="#fff" stop-opacity="0" />
    </radialGradient>
    <radialGradient :id="`${ids}-rock`" cx="0.38" cy="0.34" r="0.7">
      <stop offset="0" stop-color="#b9aea4" />
      <stop offset="0.55" stop-color="#7a6f69" />
      <stop offset="1" stop-color="#3a3333" />
    </radialGradient>
    <radialGradient :id="`${ids}-mine`" cx="0.38" cy="0.34" r="0.7">
      <stop offset="0" stop-color="#8f9ab8" />
      <stop offset="0.5" stop-color="#3a4160" />
      <stop offset="1" stop-color="#11142a" />
    </radialGradient>
    <radialGradient :id="`${ids}-core`" r="0.5">
      <stop offset="0" stop-color="#fff" />
      <stop offset="0.45" stop-color="#fff" stop-opacity="0.85" />
      <stop offset="1" stop-color="#fff" stop-opacity="0" />
    </radialGradient>
  </defs>
</template>
