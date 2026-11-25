<script setup lang="ts" generic="T extends string">
import AppIcon from './AppIcon.vue'

/**
 * Material 3 segmented buttons (square): an outlined row of options; the chosen one is
 * tinted in the accent colour and shows a check mark.
 */
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
      <AppIcon v-if="model === option.value" name="check" :size="16" class="segmented__check" />
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: flex;
  border: 1px solid color-mix(in srgb, var(--color-text) 35%, transparent);
  border-radius: 0;
  background: var(--color-surface);
}

.segmented__option {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 40px;
  padding: var(--space-1) var(--space-2);
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-standard);
}

.segmented__option + .segmented__option {
  border-left: 1px solid color-mix(in srgb, var(--color-text) 35%, transparent);
}

.segmented__option--active {
  background: var(--color-accent-soft);
  color: color-mix(in srgb, var(--color-accent) 70%, var(--color-text));
}

.segmented__check {
  flex: none;
}
</style>
