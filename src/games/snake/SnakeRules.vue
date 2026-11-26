<script setup lang="ts">
import { t } from '@/core/i18n'

/** How to play Snake (lobby expander and in-game rules dialog). */
</script>

<template>
  <p class="rules-text">{{ t('snake.lobby.howTo') }}</p>
  <p class="rules-text">{{ t('snake.lobby.howToCalm') }}</p>
</template>

<style scoped>
.rules-text {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.rules-text + .rules-text {
  margin-top: var(--space-2);
}
</style>
