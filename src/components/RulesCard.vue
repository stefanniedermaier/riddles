<script setup lang="ts">
import AppIcon from './AppIcon.vue'

/**
 * Game rules as a collapsible card (collapsed by default). Lobbies show it above the menu
 * for first-time players and below it once a game has been played.
 */
withDefaults(defineProps<{ title: string; accent?: string }>(), {
  accent: 'var(--color-accent)',
})
</script>

<template>
  <details class="rules-card card" :style="{ '--rules-accent': accent }">
    <summary class="rules-card__summary">
      <AppIcon name="info" :size="20" class="rules-card__icon" />
      <span class="rules-card__title">{{ title }}</span>
      <AppIcon name="chevronDown" :size="20" class="rules-card__chevron" />
    </summary>
    <div class="rules-card__body">
      <slot />
    </div>
  </details>
</template>

<style scoped>
.rules-card {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--rules-accent) 25%, var(--color-border));
  border-radius: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--rules-accent) 10%, var(--color-surface)), var(--color-surface) 70px);
  box-shadow: var(--elevation-1);
}

.rules-card__summary {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap-min);
  padding: var(--space-2) var(--space-4);
  font-weight: 700;
  cursor: pointer;
  list-style: none;
  user-select: none;
  -webkit-user-select: none;
}

.rules-card__summary::-webkit-details-marker {
  display: none;
}

.rules-card__icon {
  box-sizing: content-box;
  padding: 7px;
  border-radius: 0;
  background: var(--rules-accent);
  color: var(--on-game);
}

.rules-card__title {
  flex: 1;
}

.rules-card__chevron {
  box-sizing: content-box;
  padding: 4px;
  border-radius: 0;
  background: color-mix(in srgb, var(--rules-accent) 14%, transparent);
  color: var(--rules-accent);
  transition: transform var(--dur-fast) var(--ease-out);
}

.rules-card[open] .rules-card__chevron {
  transform: rotate(180deg);
}

.rules-card__body {
  padding: var(--space-2) var(--space-4) var(--space-4);
  border-top: 1px dashed color-mix(in srgb, var(--rules-accent) 30%, var(--color-border));
}

.rules-card[open] .rules-card__body {
  animation: rules-open 0.3s var(--ease-out);
}

@keyframes rules-open {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}

:root[data-motion='reduced'] .rules-card[open] .rules-card__body {
  animation: none;
}
</style>
