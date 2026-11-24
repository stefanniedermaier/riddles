<script setup lang="ts">
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import { minesSettings } from './settings'
</script>

<template>
  <div>
    <ToggleRow
      v-model="minesSettings.longPress"
      :label="t('mines.settings.longPress')"
      :description="t('mines.settings.longPressDesc')"
    />
    <ToggleRow
      v-model="minesSettings.chord"
      :label="t('mines.settings.chord')"
      :description="t('mines.settings.chordDesc')"
    />
    <ToggleRow
      v-model="minesSettings.instantMistakes"
      :label="t('mines.settings.instantMistakes')"
      :description="t('mines.settings.instantMistakesDesc')"
    />
  </div>
</template>
