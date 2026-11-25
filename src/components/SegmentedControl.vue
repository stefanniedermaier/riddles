<script setup lang="ts" generic="T extends string">
import { computed } from 'vue'

import { onRovingKey, rovingTabindex } from '@/core/rovingFocus'
import AppIcon from './AppIcon.vue'

/**
 * Material 3 segmented buttons (square): an outlined row of options; the chosen one is
 * tinted in the accent colour and shows a check mark – or, with the `icon` slot, the
 * option's own icon (tool groups). A radio group: one tab stop, arrow keys choose.
 */
const props = defineProps<{
  options: readonly { value: T; label: string }[]
  label?: string
}>()

defineSlots<{ icon?: (props: { value: T; active: boolean }) => unknown }>()

const model = defineModel<T>({ required: true })
const selected = computed(() => props.options.findIndex((option) => option.value === model.value))

function onKey(event: KeyboardEvent): void {
  const target = onRovingKey(event)
  const option = target === null ? undefined : props.options[target]
  if (option) model.value = option.value
}
</script>

<template>
  <div class="segmented" role="radiogroup" :aria-label="label">
    <button
      v-for="(option, index) in options"
      :key="option.value"
      type="button"
      role="radio"
      class="segmented__option"
      :class="{ 'segmented__option--active': model === option.value }"
      :aria-checked="model === option.value"
      :tabindex="rovingTabindex(index, selected)"
      @click="model = option.value"
      @keydown="onKey"
    >
      <slot name="icon" :value="option.value" :active="model === option.value">
        <AppIcon v-if="model === option.value" name="check" :size="16" class="segmented__check" />
      </slot>
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
  min-height: var(--tap-min);
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
