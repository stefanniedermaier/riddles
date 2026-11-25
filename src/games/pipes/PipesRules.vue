<script setup lang="ts">
import { t } from '@/core/i18n'
</script>

<template>
  <ul class="pipes-rules">
    <li>{{ t('pipes.rules.goal') }}</li>
    <li>{{ t('pipes.rules.rotate') }}</li>
    <li>{{ t('pipes.rules.ends') }}</li>
    <li>{{ t('pipes.rules.lock') }}</li>
    <li>{{ t('pipes.rules.sources') }}</li>
  </ul>
</template>

<style scoped>
.pipes-rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--text-sm);
}

.pipes-rules li::marker {
  color: var(--game-pipes);
}
</style>
