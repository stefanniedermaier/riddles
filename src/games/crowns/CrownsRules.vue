<script setup lang="ts">
import { t } from '@/core/i18n'
</script>

<template>
  <ul class="crowns-rules">
    <li>{{ t('crowns.rules.goal') }}</li>
    <li>{{ t('crowns.rules.touch') }}</li>
    <li>{{ t('crowns.rules.controls') }}</li>
  </ul>
</template>

<style scoped>
.crowns-rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--text-sm);
}

.crowns-rules li::marker {
  color: var(--game-crowns);
}
</style>
