<script setup lang="ts">
import { computed } from 'vue'

import { icons, type IconName, type IconPath } from './icons'

const props = withDefaults(defineProps<{ name: IconName; size?: number | string }>(), {
  size: 24,
})

const paths = computed<IconPath[]>(() => icons[props.name])
</script>

<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path
      v-for="(path, i) in paths"
      :key="i"
      :d="path.d"
      :fill="path.fill ? 'currentColor' : 'none'"
      :stroke="path.fill ? 'none' : 'currentColor'"
    />
  </svg>
</template>

<style scoped>
.app-icon {
  flex: none;
  display: block;
}
</style>
