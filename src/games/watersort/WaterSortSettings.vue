<script setup lang="ts">
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import { waterSortSettings } from './settings'
</script>

<template>
  <div>
    <ToggleRow
      v-model="waterSortSettings.showSymbols"
      :label="t('watersort.settings.showSymbols')"
      :description="t('watersort.settings.showSymbolsDesc')"
    />
  </div>
</template>
