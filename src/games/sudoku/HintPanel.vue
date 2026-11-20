<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import { t } from '@/core/i18n'
import type { HintView } from './explain'

defineProps<{
  view: HintView
  /** Label of the primary action, or undefined if there is none. */
  actionLabel?: string
}>()

const emit = defineEmits<{ apply: []; close: [] }>()
</script>

<template>
  <section class="hint card" role="status" aria-live="polite">
    <header class="hint__header">
      <AppIcon name="hint" :size="20" class="hint__icon" />
      <h2 class="hint__title">{{ view.title }}</h2>
      <button type="button" class="hint__close" :aria-label="t('common.close')" @click="emit('close')">
        <AppIcon name="close" :size="18" />
      </button>
    </header>
    <p v-for="(line, i) in view.lines" :key="i" class="hint__line">
      <strong v-if="line.label">{{ line.label }} </strong>{{ line.text }}
    </p>
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
}

.hint__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.hint__icon {
  color: var(--color-warning);
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
  width: 36px;
  height: 36px;
  margin-right: calc(-1 * var(--space-2));
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  cursor: pointer;
}

.hint__line {
  font-size: var(--text-sm);
  line-height: 1.4;
}
</style>
