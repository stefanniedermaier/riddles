<script setup lang="ts">
import SegmentedControl from '@/components/SegmentedControl.vue'
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import { aimLineOptions, chosenAimLine, chosenSpeed, speedOptions } from './options'
import { bubblesSettings } from './settings'
</script>

<template>
  <div class="bubbles-settings">
    <div class="field">
      <span class="field__label">{{ t('bubbles.settings.aimLine') }}</span>
      <SegmentedControl v-model="chosenAimLine" :options="aimLineOptions" :label="t('bubbles.settings.aimLine')" />
    </div>
    <ToggleRow
      v-model="bubblesSettings.symbols"
      :label="t('bubbles.settings.symbols')"
      :description="t('bubbles.settings.symbolsDetail')"
    />
    <div class="field">
      <span class="field__label">{{ t('bubbles.settings.speed') }}</span>
      <SegmentedControl v-model="chosenSpeed" :options="speedOptions" :label="t('bubbles.settings.speed')" />
    </div>
  </div>
</template>

<style scoped>
.bubbles-settings {
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
