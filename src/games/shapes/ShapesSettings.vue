<script setup lang="ts">
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import { shapesSettings } from './settings'
</script>

<template>
  <ToggleRow
    v-model="shapesSettings.idleHint"
    :label="t('shapes.settings.idleHint')"
    :description="t('shapes.settings.idleHintInfo')"
  />
</template>
