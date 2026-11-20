<script setup lang="ts">
import { t } from '@/core/i18n'
</script>

<template>
  <ul class="arrows-rules">
    <li>{{ t('arrows.rules.goal') }}</li>
    <li>{{ t('arrows.rules.blocked') }}</li>
    <li>{{ t('arrows.rules.lives') }}</li>
  </ul>
</template>

<style scoped>
.arrows-rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--text-sm);
}

.arrows-rules li::marker {
  color: var(--game-arrows);
}
</style>
