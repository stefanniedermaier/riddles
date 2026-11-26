<script setup lang="ts">
import type { PlayRouteProps } from '../routes'
import type { Variant } from './index'
import SnakePlay from './SnakePlay.vue'

// The route's values as props (`playProps`). Keyed by mode so switching modes creates a
// fresh play view (Vue Router would otherwise reuse the component instance).
defineProps<PlayRouteProps & { variant: Variant }>()
</script>

<template>
  <SnakePlay :key="variant" :variant="variant" :new-game="newGame" />
</template>
