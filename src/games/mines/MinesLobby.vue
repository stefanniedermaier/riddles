<script setup lang="ts">
import PuzzleLobby from '@/components/PuzzleLobby.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import MinesRules from './MinesRules.vue'
import { DIFFICULTIES, saveSlot, sizeLabel } from './index'
import type { MinesSave } from './logic/types'
import { minesPool } from './pool'

function savedLabel(saved: MinesSave): string {
  const { difficulty, width, height } = saved.puzzle
  return `${t(`difficulty.${difficulty}`)} · ${t('mines.boardLabel', { width, height })} · ${formatDuration(saved.elapsedMs)}`
}

const warm = (): void => minesPool.warm(DIFFICULTIES)
</script>

<template>
  <PuzzleLobby
    game="mines"
    :variants="DIFFICULTIES"
    :save="saveSlot"
    :saved-label="savedLabel"
    :variant-detail="sizeLabel"
    :warm="warm"
  >
    <template #rules><MinesRules /></template>
  </PuzzleLobby>
</template>
