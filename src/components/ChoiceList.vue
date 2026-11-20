<script setup lang="ts">
import AppIcon from './AppIcon.vue'

/**
 * Vertical list of large tappable choices (difficulties, modes, …).
 */
defineProps<{
  items: readonly { id: string; label: string; detail?: string; meta?: string; disabled?: boolean }[]
}>()

const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <ul class="choices">
    <li v-for="item in items" :key="item.id">
      <button
        type="button"
        class="choice"
        :disabled="item.disabled"
        @click="emit('select', item.id)"
      >
        <span class="choice__text">
          <span class="choice__label">{{ item.label }}</span>
          <span v-if="item.detail" class="choice__detail">{{ item.detail }}</span>
        </span>
        <span v-if="item.meta" class="choice__meta tabular">{{ item.meta }}</span>
        <AppIcon name="play" :size="18" class="choice__play" />
      </button>
    </li>
  </ul>
</template>

<style scoped>
.choices {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.choice {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 64px;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  text-align: left;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}

.choice:active:not(:disabled) {
  transform: scale(0.985);
}

.choice:disabled {
  opacity: 0.5;
  cursor: default;
}

.choice__text {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.choice__label {
  font-size: var(--text-lg);
  font-weight: 700;
}

.choice__detail,
.choice__meta {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.choice__play {
  color: var(--color-accent);
}
</style>
