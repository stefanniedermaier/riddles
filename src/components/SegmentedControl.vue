<script setup lang="ts" generic="T extends string">
defineProps<{
  options: readonly { value: T; label: string }[]
  label?: string
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="segmented" role="radiogroup" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      class="segmented__option"
      :class="{ 'segmented__option--active': model === option.value }"
      :aria-checked="model === option.value"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-md);
  background: var(--color-surface-2);
}

.segmented__option {
  flex: 1;
  min-height: 38px;
  padding: var(--space-1) var(--space-2);
  border: 0;
  border-radius: calc(var(--radius-md) - 3px);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--dur-fast);
}

.segmented__option--active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}
</style>
