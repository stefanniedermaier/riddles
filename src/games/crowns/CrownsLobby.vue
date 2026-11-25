<script setup lang="ts">
import PuzzleLobby from '@/components/PuzzleLobby.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import CrownsRules from './CrownsRules.vue'
import { DIFFICULTIES, saveSlot, sizeLabel } from './index'
import type { CrownsSave } from './logic/types'
import { crownsPool } from './pool'

function savedLabel(saved: CrownsSave): string {
  const { difficulty, size } = saved.puzzle
  return `${t(`difficulty.${difficulty}`)} · ${t('crowns.sizeLabel', { size })} · ${formatDuration(saved.elapsedMs)}`
}

const warm = (): void => crownsPool.warm(DIFFICULTIES)
</script>

<template>
  <PuzzleLobby
    game="crowns"
    :variants="DIFFICULTIES"
    :save="saveSlot"
    :saved-label="savedLabel"
    :variant-detail="sizeLabel"
    :warm="warm"
  >
    <template #rules><CrownsRules /></template>
  </PuzzleLobby>
</template>
