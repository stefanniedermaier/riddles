<script setup lang="ts">
import { useId } from 'vue'

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
    <input :id="id" v-model="model" type="checkbox" role="switch" class="toggle-row__input" />
    <span class="toggle-row__switch" aria-hidden="true" />
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

.toggle-row__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle-row__switch {
  position: relative;
  flex: none;
  box-sizing: border-box;
  width: 52px;
  height: 32px;
  /* Material 3 switch, square (design guide): outlined track and a small thumb when off,
    filled track and a large thumb when on. */
  border: 2px solid color-mix(in srgb, var(--color-text) 45%, transparent);
  border-radius: 0;
  background: var(--color-surface-3);
  transition:
    background-color var(--dur-fast) var(--ease-standard),
    border-color var(--dur-fast) var(--ease-standard);
}

.toggle-row__switch::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 6px;
  width: 16px;
  height: 16px;
  border-radius: 0;
  background: color-mix(in srgb, var(--color-text) 55%, transparent);
  transform: translateY(-50%);
  transition:
    left var(--dur-med) var(--ease-emphasized),
    width var(--dur-med) var(--ease-emphasized),
    height var(--dur-med) var(--ease-emphasized),
    background-color var(--dur-fast);
}

.toggle-row__input:checked + .toggle-row__switch {
  border-color: var(--color-accent);
  background: var(--color-accent);
}

.toggle-row__input:checked + .toggle-row__switch::after {
  left: 22px;
  width: 24px;
  height: 24px;
  background: var(--color-on-accent);
}

.toggle-row__input:disabled + .toggle-row__switch {
  opacity: 0.38;
}

.toggle-row__input:focus-visible + .toggle-row__switch {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
