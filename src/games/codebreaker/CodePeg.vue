<script setup lang="ts">
import { computed } from 'vue'

import { resolvedTheme } from '@/core/theme'
import { SHAPES, pegColor, shapeColor } from './palette'

/** One peg: a coloured disc with the colour's shape, or an empty hole. */
const props = defineProps<{ color: number | null; hidden?: boolean }>()

const fill = computed(() => (props.color === null ? undefined : pegColor(resolvedTheme.value, props.color)))
const shape = computed(() => (props.color === null ? undefined : shapeColor(resolvedTheme.value, props.color)))
</script>

<template>
  <svg class="peg" viewBox="0 0 24 24" aria-hidden="true">
    <circle v-if="hidden" class="peg__hidden" cx="12" cy="12" r="10.5" />
    <text v-if="hidden" class="peg__question" x="12" y="16.5" text-anchor="middle">?</text>
    <circle v-else-if="color === null" class="peg__hole" cx="12" cy="12" r="10.5" />
    <template v-else>
      <circle cx="12" cy="12" r="11" :fill="fill" />
      <path :d="SHAPES[color]" :fill="shape" />
    </template>
  </svg>
</template>

<style scoped>
.peg {
  display: block;
  width: 100%;
  height: 100%;
}

.peg__hole {
  fill: var(--color-surface-2);
  stroke: var(--color-border);
  stroke-width: 1.5;
}

.peg__hidden {
  fill: var(--color-surface-3);
}

.peg__question {
  fill: var(--color-text-muted);
  font-size: 13px;
  font-weight: 800;
}
</style>
