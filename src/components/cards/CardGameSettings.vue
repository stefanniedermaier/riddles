<script setup lang="ts">
import type { Ref } from 'vue'

import SegmentedControl from '@/components/SegmentedControl.vue'
import ToggleRow from '@/components/ToggleRow.vue'
import { t } from '@/core/i18n'
import type { CardSettings } from './types'

/** Settings panel shared by the card games. */
const props = defineProps<{
  settings: Ref<CardSettings>
  options: readonly ('solvable' | 'tapAuto' | 'fourColor' | 'autoFoundation')[]
}>()

/** The game's persisted settings ref (a store, not component state). */
const store = props.settings

const scoringOptions = [
  { value: 'time' as const, label: t('cards.settings.time') },
  { value: 'points' as const, label: t('cards.settings.points') },
]
</script>

<template>
  <div>
    <div class="field">
      <span class="field__label">{{ t('cards.settings.scoring') }}</span>
      <SegmentedControl v-model="store.scoring" :options="scoringOptions" :label="t('cards.settings.scoring')" />
    </div>
    <ToggleRow
      v-for="option in options"
      :key="option"
      v-model="store[option] as boolean"
      :label="t(`cards.settings.${option}`)"
      :description="t(`cards.settings.${option}Desc`)"
    />
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
}

.field__label {
  font-weight: 600;
}
</style>
