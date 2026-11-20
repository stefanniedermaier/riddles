<script setup lang="ts">
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import { crownsSettings } from './settings'
</script>

<template>
  <div>
    <ToggleRow
      v-model="crownsSettings.autoMark"
      :label="t('crowns.settings.autoMark')"
      :description="t('crowns.settings.autoMarkDesc')"
    />
    <ToggleRow
      v-model="crownsSettings.showConflicts"
      :label="t('crowns.settings.showConflicts')"
      :description="t('crowns.settings.showConflictsDesc')"
    />
  </div>
</template>
