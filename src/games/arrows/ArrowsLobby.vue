<script setup lang="ts">
import PuzzleLobby from '@/components/PuzzleLobby.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import ArrowsRules from './ArrowsRules.vue'
import { DIFFICULTIES, saveSlot, sizeLabel } from './index'
import type { ArrowsSave } from './logic/types'
import { arrowsPool } from './pool'

function savedLabel(saved: ArrowsSave): string {
  const { difficulty, size, arrows } = saved.puzzle
  return t('arrows.lobby.savedInfo', {
    difficulty: t(`difficulty.${difficulty}`),
    size: t('arrows.sizeLabel', { size }),
    left: arrows.length - saved.removed.length,
    time: formatDuration(saved.elapsedMs),
  })
}

const warm = (): void => arrowsPool.warm(DIFFICULTIES)
</script>

<template>
  <PuzzleLobby
    game="arrows"
    :variants="DIFFICULTIES"
    :save="saveSlot"
    :saved-label="savedLabel"
    :variant-detail="sizeLabel"
    :warm="warm"
  >
    <template #rules><ArrowsRules /></template>
  </PuzzleLobby>
</template>
