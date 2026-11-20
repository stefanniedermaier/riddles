<script setup lang="ts">
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import { arrowsSettings } from './settings'
</script>

<template>
  <div>
    <ToggleRow
      v-model="arrowsSettings.showBlockedPath"
      :label="t('arrows.settings.showBlockedPath')"
      :description="t('arrows.settings.showBlockedPathDesc')"
    />
  </div>
</template>
