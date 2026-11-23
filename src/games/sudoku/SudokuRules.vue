<script setup lang="ts">
import { t } from '@/core/i18n'

/** How to play Sudoku (lobby expander and in-game rules dialog). */
</script>

<template>
  <ul class="rules-list">
    <li>{{ t('sudoku.rules.goal') }}</li>
    <li>{{ t('sudoku.rules.input') }}</li>
    <li>{{ t('sudoku.rules.notes') }}</li>
  </ul>
</template>

<style scoped>
.rules-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-4);
  font-size: var(--text-sm);
}

.rules-list li::marker {
  color: var(--game-sudoku);
}
</style>
