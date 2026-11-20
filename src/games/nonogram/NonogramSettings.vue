<script setup lang="ts">
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import { nonogramSettings } from './settings'
</script>

<template>
  <div>
    <ToggleRow
      v-model="nonogramSettings.checkMistakes"
      :label="t('nonogram.settings.checkMistakes')"
      :description="t('nonogram.settings.checkMistakesDesc')"
    />
    <ToggleRow
      v-model="nonogramSettings.highlightLines"
      :label="t('nonogram.settings.highlightLines')"
      :description="t('nonogram.settings.highlightLinesDesc')"
    />
  </div>
</template>
