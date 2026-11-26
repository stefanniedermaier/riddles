<script setup lang="ts">
import type { PlayRouteProps } from '../routes'
import type { Mode } from './logic/types'
import ShapesPlay from './ShapesPlay.vue'

// The route's values as props (`playProps`). Keyed by mode: switching e.g. from Zen to Time
// creates a fresh play view (Vue Router would otherwise reuse the component instance).
defineProps<PlayRouteProps & { mode: Mode }>()
</script>

<template>
  <ShapesPlay :key="mode" :mode="mode" :new-game="newGame" />
</template>
