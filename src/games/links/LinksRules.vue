<script setup lang="ts">
import { t } from '@/core/i18n'
</script>

<template>
  <ul class="links-rules">
    <li>{{ t('links.rules.goal') }}</li>
    <li>{{ t('links.rules.fill') }}</li>
    <li>{{ t('links.rules.controls') }}</li>
  </ul>
</template>

<style scoped>
.links-rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--text-sm);
}

.links-rules li::marker {
  color: var(--game-links);
}
</style>
