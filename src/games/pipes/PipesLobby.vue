<script setup lang="ts">
import PuzzleLobby from '@/components/PuzzleLobby.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import PipesRules from './PipesRules.vue'
import { DIFFICULTIES, saveSlot, sizeLabel } from './index'
import type { PipesSave } from './logic/types'

function savedLabel(saved: PipesSave): string {
  const { difficulty } = saved.puzzle
  return `${t(`difficulty.${difficulty}`)} · ${sizeLabel(difficulty)} · ${formatDuration(saved.elapsedMs)}`
}
</script>

<template>
  <PuzzleLobby
    game="pipes"
    :variants="DIFFICULTIES"
    :save="saveSlot"
    :saved-label="savedLabel"
    :variant-detail="sizeLabel"
  >
    <template #rules><PipesRules /></template>
  </PuzzleLobby>
</template>
