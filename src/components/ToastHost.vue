<script setup lang="ts">
import { toasts } from '@/core/toast'
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id" class="toast">{{ toast.text }}</div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: max(var(--space-5), env(safe-area-inset-bottom));
  /* Below modal dialogs (z-index 100), so a toast never covers dialog buttons. */
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  width: min(calc(100% - 2 * var(--space-4)), 420px);
  transform: translateX(-50%);
  pointer-events: none;
}

.toast {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-text);
  color: var(--color-bg);
  font-size: var(--text-sm);
  font-weight: 600;
  text-align: center;
  box-shadow: var(--shadow-md);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--dur-med),
    transform var(--dur-med) var(--ease-out);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
