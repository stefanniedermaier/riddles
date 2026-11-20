<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import type { Mode } from './logic/types'
import ShapesPlay from './ShapesPlay.vue'

// Keyed by mode: switching e.g. from Zen to Time creates a fresh play view
// (Vue Router would otherwise reuse the component instance).
const route = useRoute()
const mode = computed(() => route.params.mode as Mode)
</script>

<template>
  <ShapesPlay :key="mode" :mode="mode" />
</template>
