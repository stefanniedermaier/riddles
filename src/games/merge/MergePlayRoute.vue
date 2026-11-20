<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import type { Variant } from './index'
import MergePlay from './MergePlay.vue'

// Keyed by variant so switching variants creates a fresh play view.
const route = useRoute()
const variant = computed(() => route.params.variant as Variant)
</script>

<template>
  <MergePlay :key="variant" :variant="variant" />
</template>
