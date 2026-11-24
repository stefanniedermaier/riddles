<script setup lang="ts">
import { t } from '@/core/i18n'
</script>

<template>
  <ul class="codebreaker-rules">
    <li>{{ t('codebreaker.rules.goal') }}</li>
    <li>{{ t('codebreaker.rules.feedback') }}</li>
    <li>{{ t('codebreaker.rules.order') }}</li>
    <li>{{ t('codebreaker.rules.repeats') }}</li>
  </ul>
</template>

<style scoped>
.codebreaker-rules {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding-left: var(--space-5);
  font-size: var(--text-sm);
}

.codebreaker-rules li::marker {
  color: var(--game-codebreaker);
}
</style>
