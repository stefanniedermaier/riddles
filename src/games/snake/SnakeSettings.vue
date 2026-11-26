<script setup lang="ts">
import SegmentedControl from '@/components/SegmentedControl.vue'
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import { snakeSettings } from './settings'
import { chosenSpeed, speedOptions } from './speeds'
</script>

<template>
  <div class="snake-settings">
    <div class="field">
      <span class="field__label">{{ t('snake.settings.speed') }}</span>
      <SegmentedControl v-model="chosenSpeed" :options="speedOptions" :label="t('snake.settings.speed')" />
    </div>
    <ToggleRow v-model="snakeSettings.pad" :label="t('snake.settings.pad')" :description="t('snake.settings.padDetail')" />
  </div>
</template>

<style scoped>
.snake-settings {
  display: flex;
  flex-direction: column;
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4) var(--space-1);
}

.field__label {
  font-weight: 500;
}
</style>
