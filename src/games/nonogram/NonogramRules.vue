<script setup lang="ts">
import { t } from '@/core/i18n'
</script>

<template>
  <ul class="nonogram-rules">
    <li>{{ t('nonogram.rules.goal') }}</li>
    <li>{{ t('nonogram.rules.gaps') }}</li>
    <li>{{ t('nonogram.rules.controls') }}</li>
  </ul>
</template>

<style scoped>
.nonogram-rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--text-sm);
}

.nonogram-rules li::marker {
  color: var(--game-nonogram);
}
</style>
