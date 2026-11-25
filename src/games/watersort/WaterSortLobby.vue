<script setup lang="ts">
import PuzzleLobby from '@/components/PuzzleLobby.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import WaterSortRules from './WaterSortRules.vue'
import { DIFFICULTIES, saveSlot, sizeLabel } from './index'
import type { WaterSortSave } from './logic/types'

function savedLabel(saved: WaterSortSave): string {
  const { difficulty } = saved.puzzle
  return `${t(`difficulty.${difficulty}`)} · ${sizeLabel(difficulty)} · ${formatDuration(saved.elapsedMs)}`
}
</script>

<template>
  <PuzzleLobby
    game="watersort"
    :variants="DIFFICULTIES"
    :save="saveSlot"
    :saved-label="savedLabel"
    :variant-detail="sizeLabel"
  >
    <template #rules><WaterSortRules /></template>
  </PuzzleLobby>
</template>
