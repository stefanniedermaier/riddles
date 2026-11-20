<script setup lang="ts">
import type { IconName } from './icons'
import AppIcon from './AppIcon.vue'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    icon?: IconName
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'secondary', icon: undefined, block: false, disabled: false, type: 'button' },
)
</script>

<template>
  <button
    :type="type"
    class="app-btn"
    :class="[`app-btn--${variant}`, { 'app-btn--block': block }]"
    :disabled="disabled"
  >
    <AppIcon v-if="icon" :name="icon" :size="20" />
    <span v-if="$slots.default" class="app-btn__label"><slot /></span>
  </button>
</template>

<style scoped>
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--tap-min);
  padding: var(--space-2) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition:
    transform var(--dur-fast) var(--ease-out),
    background-color var(--dur-fast);
}

.app-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.app-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.app-btn--block {
  display: flex;
  width: 100%;
}

.app-btn--primary {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.app-btn--secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.app-btn--ghost {
  background: transparent;
  color: var(--color-text);
}

.app-btn--danger {
  background: var(--color-error-soft);
  color: var(--color-error);
}
</style>
