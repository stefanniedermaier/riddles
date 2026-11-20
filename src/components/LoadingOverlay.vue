<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

<template>
  <div class="loading" role="status" aria-live="polite">
    <div class="loading__spinner" aria-hidden="true" />
    <p v-if="label" class="loading__label">{{ label }}</p>
  </div>
</template>

<style scoped>
.loading {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  min-height: 240px;
  color: var(--color-text-muted);
}

.loading__spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--color-surface-3);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

:root[data-motion='reduced'] .loading__spinner {
  animation-duration: 2.5s;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
