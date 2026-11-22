<script setup lang="ts">
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import { nonogramSettings } from './settings'
</script>

<template>
  <div>
    <ToggleRow
      v-model="nonogramSettings.instantMistakes"
      :label="t('nonogram.settings.instantMistakes')"
      :description="t('nonogram.settings.instantMistakesDesc')"
    />
    <ToggleRow
      v-model="nonogramSettings.highlightLines"
      :label="t('nonogram.settings.highlightLines')"
      :description="t('nonogram.settings.highlightLinesDesc')"
    />
  </div>
</template>
