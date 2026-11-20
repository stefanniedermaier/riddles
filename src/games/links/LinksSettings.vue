<script setup lang="ts">
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import { linksSettings } from './settings'
</script>

<template>
  <div>
    <ToggleRow
      v-model="linksSettings.showLabels"
      :label="t('links.settings.showLabels')"
      :description="t('links.settings.showLabelsDesc')"
    />
  </div>
</template>
