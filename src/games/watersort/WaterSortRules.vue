<script setup lang="ts">
import { t } from '@/core/i18n'
</script>

<template>
  <ul class="watersort-rules">
    <li>{{ t('watersort.rules.goal') }}</li>
    <li>{{ t('watersort.rules.pour') }}</li>
    <li>{{ t('watersort.rules.allowed') }}</li>
    <li>{{ t('watersort.rules.undo') }}</li>
  </ul>
</template>

<style scoped>
.watersort-rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--text-sm);
}

.watersort-rules li::marker {
  color: var(--game-watersort);
}
</style>
