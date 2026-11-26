<script setup lang="ts">
import type { PlayRouteProps } from '../routes'
import type { Variant } from './index'
import MergePlay from './MergePlay.vue'

// The route's values as props (`playProps`). Keyed by variant so switching variants creates
// a fresh play view (Vue Router would otherwise reuse the component instance).
defineProps<PlayRouteProps & { variant: Variant }>()
</script>

<template>
  <MergePlay :key="variant" :variant="variant" :new-game="newGame" />
</template>
