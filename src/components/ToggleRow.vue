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
  width: 46px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--color-surface-3);
  transition: background-color var(--dur-fast);
}

.toggle-row__switch::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform var(--dur-fast) var(--ease-out);
}

.toggle-row__input:checked + .toggle-row__switch {
  background: var(--color-accent);
}

.toggle-row__input:checked + .toggle-row__switch::after {
  transform: translateX(18px);
}

.toggle-row__input:focus-visible + .toggle-row__switch {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
