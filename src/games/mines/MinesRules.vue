<script setup lang="ts">
import { t } from '@/core/i18n'
</script>

<template>
  <ul class="mines-rules">
    <li>{{ t('mines.rules.goal') }}</li>
    <li>{{ t('mines.rules.numbers') }}</li>
    <li>{{ t('mines.rules.flags') }}</li>
    <li>{{ t('mines.rules.logic') }}</li>
  </ul>
</template>

<style scoped>
.mines-rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--text-sm);
}

.mines-rules li::marker {
  color: var(--game-mines);
}
</style>
