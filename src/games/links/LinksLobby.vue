<script setup lang="ts">
import PuzzleLobby from '@/components/PuzzleLobby.vue'
import { formatDuration } from '@/core/format'
import { t } from '@/core/i18n'
import LinksRules from './LinksRules.vue'
import { DIFFICULTIES, saveSlot, sizeLabel } from './index'
import type { LinksSave } from './logic/types'
import { linksPool } from './pool'

function savedLabel(saved: LinksSave): string {
  const { difficulty, size } = saved.puzzle
  return `${t(`difficulty.${difficulty}`)} · ${t('links.sizeLabel', { size })} · ${formatDuration(saved.elapsedMs)}`
}

const warm = (): void => linksPool.warm(DIFFICULTIES)
</script>

<template>
  <PuzzleLobby
    game="links"
    :variants="DIFFICULTIES"
    :save="saveSlot"
    :saved-label="savedLabel"
    :variant-detail="sizeLabel"
    :warm="warm"
  >
    <template #rules><LinksRules /></template>
  </PuzzleLobby>
</template>
