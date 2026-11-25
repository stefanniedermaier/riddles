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
/*
 * Material 3 buttons, square: primary = filled, secondary = outlined, ghost = text,
 * danger = tonal error. Feedback comes from the state layer and the ripple (base.css).
 */
.app-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--tap-min);
  padding: var(--space-2) var(--space-5);
  border: 1px solid transparent;
  border-radius: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    box-shadow var(--dur-fast) var(--ease-standard),
    background-color var(--dur-fast) var(--ease-standard);
}

.app-btn:disabled {
  opacity: 0.38;
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

@media (hover: hover) {
  .app-btn--primary:hover:not(:disabled) {
    box-shadow: var(--elevation-1);
  }
}

.app-btn--secondary {
  background: transparent;
  border-color: color-mix(in srgb, var(--color-text) 35%, transparent);
  color: var(--color-accent);
}

.app-btn--ghost {
  background: transparent;
  color: var(--color-accent);
}

.app-btn--danger {
  background: var(--color-error-soft);
  color: var(--color-error);
}
</style>
