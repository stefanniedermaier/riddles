<script setup lang="ts">
import { t } from '@/core/i18n'

/** How to play Blocks (lobby expander and in-game rules dialog). */
</script>

<template>
  <div class="rules-text">
    <p>{{ t('blocks.lobby.howTo') }}</p>
    <p>{{ t('blocks.lobby.howToScore') }}</p>
  </div>
</template>

<style scoped>
.rules-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
