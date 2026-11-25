<script setup lang="ts">
import { t } from '@/core/i18n'
import AppIcon from './AppIcon.vue'

/**
 * "Continue" button of the lobbies: a full-width bar in the game's colour (`--lobby-accent`,
 * set on the lobby's `<main>`) with the saved game's details and a play triangle.
 */
withDefaults(defineProps<{ detail?: string; label?: string }>(), {
  detail: undefined,
  label: undefined,
})

const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button type="button" class="continue" @click="emit('click')">
    <span class="continue__text">
      <span class="continue__label">{{ label ?? t('common.continue') }}</span>
      <span v-if="detail" class="continue__detail tabular">{{ detail }}</span>
    </span>
    <AppIcon name="play" :size="26" class="continue__play" />
  </button>
</template>

<style scoped>
.continue {
  --accent: var(--lobby-accent, var(--color-accent));

  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 72px;
  margin-top: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border: 0;
  background: var(--accent);
  box-shadow: var(--shadow-md);
  color: #fff;
  text-align: left;
  cursor: pointer;
  transition: box-shadow var(--dur-fast) var(--ease-standard);
}

/* The game colours are light in dark mode: dark text there. */
:root[data-theme='dark'] .continue {
  color: var(--color-bg);
}

.continue__text {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.continue__label {
  font-size: var(--text-lg);
  font-weight: 800;
}

.continue__detail {
  font-size: var(--text-sm);
  opacity: 0.9;
}

.continue__play {
  flex: none;
}
</style>
