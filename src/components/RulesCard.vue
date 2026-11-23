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
  border-top: 4px solid var(--rules-accent);
  overflow: hidden;
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
  color: var(--rules-accent);
}

.rules-card__title {
  flex: 1;
}

.rules-card__chevron {
  color: var(--color-text-muted);
  transition: transform var(--dur-fast) var(--ease-out);
}

.rules-card[open] .rules-card__chevron {
  transform: rotate(180deg);
}

.rules-card__body {
  padding: 0 var(--space-4) var(--space-4);
}
</style>
