<script setup lang="ts">
import { t } from '@/core/i18n'
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'

/**
 * Hint card under a board (Sudoku, Stars): title, explanation (default slot) and an
 * optional primary action. Read out when it appears.
 */
defineProps<{
  title: string
  /** Label of the primary action, or undefined if there is none. */
  actionLabel?: string
}>()

const emit = defineEmits<{ apply: []; close: [] }>()
</script>

<template>
  <section class="hint card" role="status" aria-live="polite">
    <header class="hint__header">
      <AppIcon name="hint" :size="20" class="hint__icon" />
      <h2 class="hint__title">{{ title }}</h2>
      <button type="button" class="hint__close" :aria-label="t('common.close')" @click="emit('close')">
        <AppIcon name="close" :size="18" />
      </button>
    </header>
    <div class="hint__body"><slot /></div>
    <AppButton v-if="actionLabel" variant="primary" block @click="emit('apply')">
      {{ actionLabel }}
    </AppButton>
  </section>
</template>

<style scoped>
.hint {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-3) var(--space-4) var(--space-4);
  border-left: 4px solid var(--color-accent);
}

.hint__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.hint__icon {
  color: var(--color-accent);
}

.hint__title {
  flex: 1;
  font-size: var(--text-md);
  font-weight: 700;
}

.hint__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--tap-min);
  height: var(--tap-min);
  margin-right: calc(-1 * var(--space-3));
  margin-block: calc(-1 * var(--space-1));
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.hint__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
  font-size: var(--text-sm);
  line-height: 1.4;
}
</style>
