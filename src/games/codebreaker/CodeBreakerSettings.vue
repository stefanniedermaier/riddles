<script setup lang="ts">
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import { codeBreakerSettings } from './settings'
</script>

<template>
  <div>
    <ToggleRow
      v-model="codeBreakerSettings.checkGuesses"
      :label="t('codebreaker.settings.checkGuesses')"
      :description="t('codebreaker.settings.checkGuessesDesc')"
    />
    <ToggleRow
      v-model="codeBreakerSettings.showPossible"
      :label="t('codebreaker.settings.showPossible')"
      :description="t('codebreaker.settings.showPossibleDesc')"
    />
  </div>
</template>
