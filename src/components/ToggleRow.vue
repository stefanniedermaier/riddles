<script setup lang="ts">
import { useId } from 'vue'

import SwitchControl from './SwitchControl.vue'

defineProps<{ label: string; description?: string }>()
const model = defineModel<boolean>({ required: true })
const id = useId()
</script>

<template>
  <label class="toggle-row" :for="id">
    <span class="toggle-row__text">
      <span class="toggle-row__label">{{ label }}</span>
      <span v-if="description" class="toggle-row__desc">{{ description }}</span>
    </span>
    <SwitchControl :id="id" v-model="model" />
  </label>
</template>

<style scoped>
.toggle-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 52px;
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
}

.toggle-row + .toggle-row {
  border-top: 1px solid var(--color-border);
}

.toggle-row__text {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.toggle-row__desc {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
