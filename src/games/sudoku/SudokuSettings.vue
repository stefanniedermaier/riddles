<script setup lang="ts">
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import { sudokuSettings } from './settings'
</script>

<template>
  <div>
    <ToggleRow v-model="sudokuSettings.highlightPeers" :label="t('sudoku.settings.highlightPeers')" />
    <ToggleRow
      v-model="sudokuSettings.highlightSameDigits"
      :label="t('sudoku.settings.highlightSameDigits')"
    />
    <ToggleRow
      v-model="sudokuSettings.autoCleanNotes"
      :label="t('sudoku.settings.autoCleanNotes')"
      :description="t('sudoku.settings.autoCleanNotesDetail')"
    />
  </div>
</template>
