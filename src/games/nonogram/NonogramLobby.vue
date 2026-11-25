<script setup lang="ts">
import PuzzleLobby from '@/components/PuzzleLobby.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import NonogramRules from './NonogramRules.vue'
import { DIFFICULTIES, saveSlot, sizeLabel } from './index'
import type { NonogramSave } from './logic/types'
import { nonogramPool } from './pool'

function savedLabel(saved: NonogramSave): string {
  const { difficulty, width, height } = saved.puzzle
  return `${t(`difficulty.${difficulty}`)} · ${t('nonogram.sizeLabel', { width, height })} · ${formatDuration(saved.elapsedMs)}`
}

const warm = (): void => nonogramPool.warm(DIFFICULTIES)
</script>

<template>
  <PuzzleLobby
    game="nonogram"
    :variants="DIFFICULTIES"
    :save="saveSlot"
    :saved-label="savedLabel"
    :variant-detail="sizeLabel"
    :warm="warm"
  >
    <template #rules><NonogramRules /></template>
  </PuzzleLobby>
</template>
