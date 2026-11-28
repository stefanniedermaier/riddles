<script setup lang="ts">
import type { PlayRouteProps } from '../routes'
import BubblesPlay from './BubblesPlay.vue'
import type { Variant } from './index'

// The route's values as props (`playProps`). Keyed by mode so switching modes creates a
// fresh play view (Vue Router would otherwise reuse the component instance).
defineProps<PlayRouteProps & { variant: Variant }>()
</script>

<template>
  <BubblesPlay :key="variant" :variant="variant" :new-game="newGame" />
</template>
